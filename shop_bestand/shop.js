const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Function to read CSV file and parse data into a map
async function readCSVFile(filePath, isFile1) {
    const dataMap = new Map();
    const fileStream = fs.createReadStream(filePath);

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        const [id, amountOrPrice, name] = line.split(',');
        if (isFile1) {
            dataMap.set(id, { amount: amountOrPrice.trim(), name: name.trim(), price: "0,00" });
        } else {
            dataMap.set(id, { price: amountOrPrice.trim() });
        }
    }
    return dataMap;
}

// Function to merge data from two CSV maps and write to a result file
async function mergeAndWriteResult(file1Path, file2Path, resultFilePath) {
    // Read File 1 and File 2 data into maps
    const file1Data = await readCSVFile(file1Path, true);
    const file2Data = await readCSVFile(file2Path, false);

    // Process and merge data
    for (let [id, file1Row] of file1Data.entries()) {
        if (file2Data.has(id)) {
            file1Row.price = file2Data.get(id).price;
        }
    }

    // Write result to a new CSV file
    const output = Array.from(file1Data.entries())
        .map(([id, { amount, name, price }]) => `${id}, ${amount}, ${name}, ${price}`)
        .join('\n');

    fs.writeFileSync(resultFilePath, output, 'utf8');
    console.log(`Result written to ${resultFilePath}`);
}

// Define file paths
const file1Path = path.join(__dirname, 'file1.csv');
const file2Path = path.join(__dirname, 'file2.csv');
const resultFilePath = path.join(__dirname, 'result.csv');

// Execute the merge function
mergeAndWriteResult(file1Path, file2Path, resultFilePath)
    .then(() => console.log("Processing complete"))
    .catch(err => console.error(err));
