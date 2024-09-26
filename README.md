# Hyva Compatibility Checker

A Node.js application to identify Magento modules requiring Hyva compatibility.

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
