const readline = require("readline")//for user input
const CafeInventory = require("./CafeInventory")
const { connectDB } = require("./db")
const { startSpoilageMonitor, checkInventoryParallel } = require("./ParallelChecker")

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const cafe = new CafeInventory()

async function menu(){
    console.log("\n=================================")
    console.log("       CAFE INVENTORY SYSTEM")
    console.log("=================================")
    console.log("Date:", new Date().toLocaleString())
    console.log("1 Add")
    console.log("2 Restock")
    console.log("3 Delete")
    console.log("4 Show")
    console.log("5 Compute")
    console.log("6 Return to Main Menu")
    console.log("7 Exit")

    await checkInventoryParallel()

    rl.question("Choice: ", async choice => {//to run inventory status muna 

        if(choice === "1"){
            rl.question("Item ID (or 6 to cancel): ", async id => {
                if(id === "6") return menu()

                const exists = await cafe.searchById(Number(id))
                if(exists){
                    console.log(`ID ${id} already exists. Cannot add.`)
                    return menu()
                }

                rl.question("Item name (or 6 to cancel): ", async name => {
                    if(name === "6") return menu()

                    rl.question("Add quantity (or 6 to cancel): ", async quantity => {
                        if(quantity === "6") return menu()

                        rl.question("Spoilage date YYYY-MM-DD (or 6 to cancel): ", async spoilageDate => {
                            if(spoilageDate === "6") return menu()

                            const success = await cafe.addItem(Number(id), name, Number(quantity), spoilageDate)
                            if(success){
                                startSpoilageMonitor()
                                console.log(`✅ Added ${quantity} of ${name} with ID ${id}`)
                            }
                            menu()
                        })
                    })
                })
            })
        }

        else if(choice === "2"){
            rl.question("Item ID (or 6 to cancel): ", async id => {
                if(id === "6") return menu()

                rl.question("Restock quantity (or 6 to cancel): ", async quantity => {
                    if(quantity === "6") return menu()

                    rl.question("Spoilage date YYYY-MM-DD (or 6 to cancel): ", async spoilageDate => {
                        if(spoilageDate === "6") return menu()

                        const success = await cafe.restockItem(Number(id), Number(quantity), spoilageDate)
                        if(success){
                            startSpoilageMonitor()
                        }
                        menu()
                    })
                })
            })
        }

        else if(choice === "3"){
            console.log("\n--- DELETE ---")
            console.log("1 Delete specific batch")
            console.log("2 Delete all batches of an item")
            console.log("6 Cancel")

            rl.question("Choice: ", async deleteChoice => {

                if(deleteChoice === "1"){
                    rl.question("Item ID (or 6 to cancel): ", async id => {
                        if(id === "6") return menu()

                        rl.question("Batch ID (or 6 to cancel): ", async batchId => {
                            if(batchId === "6") return menu()

                            const success = await cafe.deleteItem(Number(id), Number(batchId))
                            if(success) console.log(`Deleted Item ID ${id} Batch ${batchId}`)
                            menu()
                        })
                    })
                }

                else if(deleteChoice === "2"){
                    rl.question("Item ID (or 6 to cancel): ", async id => {
                        if(id === "6") return menu()

                        const success = await cafe.deleteAllBatches(Number(id))
                        if(success) console.log(`Deleted all batches for Item ID ${id}`)
                        menu()
                    })
                }

                else if(deleteChoice === "6"){
                    menu()
                }

                else{
                    console.log("Invalid choice")
                    menu()
                }
            })
        }

        else if(choice === "4"){
            await cafe.showInventory()
            menu()
        }

        else if(choice === "5"){
            await cafe.computeTotals()
            menu()
        }

        else if(choice === "6"){
            menu()
        }

        else if(choice === "7"){
            console.log("Exiting...")
            process.exit()
        }

        else{
            console.log("Invalid choice")
            menu()
        }
    })
}

async function start(){
    await connectDB()
    menu()
}

start()