# Hyva Compatibility Checker

A Node.js application to identify Magento modules requiring Hyva compatibility. Useful for you next luma to Hyvä project on Magento 2.

## Description

This tool scans your Magento project and gives you a list of modules that require Hyva compatibility, indicating how many frontend files require attention. It provides both JSON & CSV reports which can be used to plan your Hyva frontend development.

The reports will give you information such as:
- Module Name
- Relative Path
- Has Compatibility Module Installed
- JS File list (in JSON report only)
- JS Line Count
- JS Files size (in JSON report only)
- PHTML File list (in JSON report only)
- PHTML Line Count
- PHTML Files size (in JSON report only)
- Layout File list (in JSON report only)
- Layout Line Count
- Layout Files size (in JSON report only)

## Installation & Usage

1. Clone the repository to the root of your Magento installation
2. Install dependencies:
   ```
   npm --prefix hyva-compatibility-checker install
   ```
3. Run the script:
   ```
   npm --prefix hyva-compatibility-checker start
   ```

The script will generate a `hyva-compatibility-analysis` folder with the JSON & CSV reports. 
Review these reports to identify the modules that require Hyva compatibility modules.
Remember to checkout the [Hyva Compatibility Module Tracker] to see if there is already a Hyva compatibility modules available which can be used. 
If there is no Hyva compatibility modules available, you can create either:
- create a new issue in the [Hyva Compatibility Module Tracker] to request a new Hyva compatibility modules.
- create a new Hyva compatibility modules yourself following the [Hyvä documentation].


### Install Globally and Run

```
cd hyva-compatibility-checker
npm install
npm install -g .
```

Run `hyva-compatibility-checker` from your Magento root directory.

### UnInstall Globally
From any directory run `npm uninstall -g hyva-compatibility-checker`



[Hyva Compatibility Module Tracker]: https://gitlab.hyva.io/hyva-public/module-tracker/
[Hyvä documentation]: https://docs.hyva.io/hyva-themes/compatibility-modules/index.html
