import { glob } from 'glob';
import fs from 'fs';
import path from 'path';
import ora from 'ora';

const MAGENTO_SUBDIRECTORIES = ['app/code', 'vendor'];

function readConfigFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const moduleMatch = content.match(/'modules'\s*=>\s*\[([\s\S]*?)\]/);
        if (moduleMatch && moduleMatch[1]) {
            return moduleMatch[1]
                .match(/'([^']+)'/g)
                .map(m => m.replace(/'/g, ''));
        }
        return [];
    } catch (error) {
        console.error('Error reading config file:', error.message);
        return [];
    }
}

async function findModulePath(moduleName, magentoRoot) {
    let modulePath = false;
    const possibleSubDirectories = getPossibleDirectories(moduleName);

    const possibleDirectories = MAGENTO_SUBDIRECTORIES.map(subDir => path.join(magentoRoot, subDir));

    for (const subDir of possibleSubDirectories) {
        for (const baseDir of possibleDirectories) {
            let fullPath = `${baseDir}/${subDir}`.replace(/\/\//g, '/');
            if (fs.existsSync(fullPath)) {
                modulePath = fullPath;
                break;
            }
        }

        if (modulePath) break;
    }

    if (!modulePath) {
        const registrationFiles = glob.sync(path.join(magentoRoot, '**', 'registration.php'));
        for (const file of registrationFiles) {
            const content = fs.readFileSync(file, 'utf8');
            if (content.includes(moduleName)) {
                modulePath = path.dirname(file);
                break;
            }
        }
    }

    return modulePath ? modulePath : 'Not found';
}

function getPossibleDirectories(moduleName) {
    const parts = moduleName.split('_');
    const appCode = parts.join('/');
    const vendor = `${parts[0]}/${parts[1]?.replace(/\/([A-Z])/g, '/$1').replace(/([A-Z])/g, '-$1').replace(/^-(?=.)/, '')}`.toLowerCase();
    const vendorModule = `${parts[0]}/module-${parts[1]?.replace(/\/([A-Z])/g, '/$1').replace(/([A-Z])/g, '-$1').replace(/^-(?=.)/, '')}`.toLowerCase();
    const vendorMagento2 = `${parts[0]}/magento2-${parts[1]?.replace(/\/([A-Z])/g, '/$1').replace(/([A-Z])/g, '-$1').replace(/^-(?=.)/, '')}`.toLowerCase();

    return [appCode, vendor, vendorModule, vendorMagento2];
}

function getHyvaCompatibilityModuleName(moduleName) {
    const parts = moduleName.split('_');
    return `Hyva_${parts.join('')}`;
}

async function filterModules(modules, modulesInclHyva) {
    const filteredModules = modules.filter(module => {
        const hyvaCompatibilityModuleName = getHyvaCompatibilityModuleName(module.name);

        module.layoutFiles = [];
        module.layoutLineCount = 0;
        module.layoutFilesSize = 0;
        module.jsFiles = [];
        module.jsLineCount = 0;
        module.jsFilesSize = 0;
        module.phtmlFiles = [];
        module.phtmlLineCount = 0;
        module.phtmlFilesSize = 0;
        module.compatibilityModuleInstalled = modulesInclHyva.includes(hyvaCompatibilityModuleName) ? hyvaCompatibilityModuleName : 'Not Found';

        const path = module.path;
        const files = glob.sync(path + '/**/*', { nodir: true });
        const frontendFiles = files.filter(file => file.includes('view/frontend'));
        const hyvaFiles = files.filter(file => {
            const fileName = file.split('/').pop(); // Get just the filename
            const isHyvaFile = fileName.startsWith('hyva_') && fileName.endsWith('.xml');
            const isTailwindFile = file.includes('tailwind');

            if (fileName.endsWith('.phtml') && file.includes('view/frontend/')) {
                module.phtmlFiles.push(file);
                module.phtmlFilesSize += fs.statSync(file)?.size ?? 0;
                module.phtmlLineCount += fs.readFileSync(file, 'utf8')?.split('\n')?.length ?? 0;
            }

            if (fileName.endsWith('.js') && file.includes('view/frontend/')) {
                module.jsFiles.push(file);
                module.jsFilesSize += fs.statSync(file)?.size ?? 0;
                module.jsLineCount += fs.readFileSync(file, 'utf8')?.split('\n')?.length ?? 0;
            }

            if (fileName.endsWith('.xml') && file.includes('view/frontend/layout')) {
                module.layoutFiles.push(file);
                module.layoutFilesSize += fs.statSync(file)?.size ?? 0;
                module.layoutLineCount += fs.readFileSync(file, 'utf8')?.split('\n')?.length ?? 0;
            }

            return isHyvaFile || isTailwindFile;
        });

        const requiresHyvaCompatibility = frontendFiles.length > 0 && hyvaFiles.length === 0;

        return requiresHyvaCompatibility;
    });

    return filteredModules;
}

function addSummary(modulesPathMap) {
    const summary = {
        info: "Summary of the modules and files which require Hyva compatibility",
        totalModules: modulesPathMap.length,
        jsFiles: modulesPathMap.reduce((acc, module) => acc + module.jsFiles.length, 0),
        jsLineCount: modulesPathMap.reduce((acc, module) => acc + module.jsLineCount, 0),
        jsFilesSize: modulesPathMap.reduce((acc, module) => acc + module.jsFilesSize, 0),
        phtmlFiles: modulesPathMap.reduce((acc, module) => acc + module.phtmlFiles.length, 0),
        phtmlLineCount: modulesPathMap.reduce((acc, module) => acc + module.phtmlLineCount, 0),
        phtmlFilesSize: modulesPathMap.reduce((acc, module) => acc + module.phtmlFilesSize, 0),
        layoutFiles: modulesPathMap.reduce((acc, module) => acc + module.layoutFiles.length, 0),
        layoutLineCount: modulesPathMap.reduce((acc, module) => acc + module.layoutLineCount, 0),
        layoutFilesSize: modulesPathMap.reduce((acc, module) => acc + module.layoutFilesSize, 0)
    };

    modulesPathMap.unshift(summary);
    return modulesPathMap;
}

async function main() {
    console.log(
        "Optionally pass magento root as an argument:\n" +
        "    npm start /path/to/magento\n"
    );

    const magentoRoot = process.argv[2] || path.join(process.cwd(), '..');
    const configPath = path.join(magentoRoot, 'app', 'etc', 'config.php');
    if (!fs.existsSync(configPath)) {
        console.log("\u274C Error: app/etc/config.php not found. Make sure you're in the Magento 2 root directory or pass the correct path.");
        process.exit(1);
    }
    console.log("\u2705 Retrieved app/etc/config.php");

    const modulesInclHyva = readConfigFile(configPath).filter(module => !module.includes('Magento_'));
    let modules = modulesInclHyva.filter(module => !module.includes('Hyva_'));
    console.log("\u2705 Parsed config.php and retrieved module list of third party and custom modules");

    const modulePaths = [];
    let completedModules = 0;
    const totalModules = modules.length;
    const spinner = ora(`Finding module paths... [0/${totalModules}]`).start();

    for (const module of modules) {
        modulePaths.push(await findModulePath(module, magentoRoot));
        completedModules++;
        spinner.text =`Finding module paths... [${completedModules}/${totalModules}]`;
        spinner.render();
    }

    let modulesPathMap = modules.map((module, index) => {
        return {
            name: module,
            path: modulePaths[index]
        }
    });
    spinner.stopAndPersist({ symbol: '\u2705', text: `Found ${completedModules}/${totalModules} module paths` });

    modulesPathMap = await filterModules(modulesPathMap, modulesInclHyva);
    console.log(`\u2705 Filtered Modules. ${modulesPathMap.length} may require Hyva compatibility.`);

    modulesPathMap = addSummary(modulesPathMap);
    console.log("\u2705 Analyzed files");

    const reportsPath = path.join(magentoRoot, 'hyva-compatibility-analysis');
    let outputCSV = 'Module,Relative Path,Compatibility Module,JS Files,JS Line Count,PHTML Files,PHTML Line Count,Layout Files,Layout Line Count\n';
    for (const module of modulesPathMap) {
        if (module.name && module.path) {
            outputCSV += `
                ${module.name},
                ${module.path?.replace(magentoRoot, '')?.replace(/^\//, '')},
                ${module.compatibilityModuleInstalled},
                ${module.jsFiles.length},
                ${module.jsLineCount},
                ${module.phtmlFiles.length},
                ${module.phtmlLineCount},
                ${module.layoutFiles.length},
                ${module.layoutLineCount}
            `.replace(/\s+/g, '').trim() + '\n';
        }
    }

    if (!fs.existsSync(reportsPath)) {
        fs.mkdirSync(reportsPath);
    }
    fs.writeFileSync(`${reportsPath}/report.csv`, outputCSV);
    fs.writeFileSync(`${reportsPath}/report.json`, JSON.stringify(modulesPathMap, null, 2));

    console.log('\n');
    console.log(`Results have been written to the directory:`);
    console.log(` \x1b]8;;file://${reportsPath}\x07${reportsPath}\x1b]8;;\x07`);
}

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

(async () => {
    try {
        await main();
    } catch (error) {
        console.error("An error occurred:", error);
        process.exit(1);
    }
})();
