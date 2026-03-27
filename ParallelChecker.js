const { getDB } = require("./db")//parallel programming

let monitor = null
let spoiledAlreadyReported = new Set()

function startSpoilageMonitor(){

    if(monitor) return

    monitor = setInterval(async ()=>{

        const db = getDB()
        const batches = await db.collection("batches").find().toArray()

        if(batches.length === 0){
            process.stdout.write("\n[Parallel] No batches to monitor. Stopping...\n")
            clearInterval(monitor)
            monitor = null
            return
        }

        const today = new Date()
        let active = false
        let newlySpoiled = []

        for(let b of batches){

            if(b.quantity > 0) active = true

            if(new Date(b.spoilageDate) <= today && b.quantity > 0){

                const batchKey = `${b.itemId}-batch${b.batchId}`

                await db.collection("batches").updateOne(
                    { itemId: b.itemId, batchId: b.batchId },
                    {
                        $inc: { totalSpoiled: b.quantity },
                        $set: { quantity: 0 }
                    }
                )

                if(!spoiledAlreadyReported.has(batchKey)){
                    const item = await db.collection("items").findOne({ id: b.itemId })
                    newlySpoiled.push(`${item ? item.name : b.itemId} Batch ${b.batchId}`)
                    spoiledAlreadyReported.add(batchKey)
                }
            }
        }

        if(newlySpoiled.length > 0){
            process.stdout.write(`\n[Parallel] ⚠️ Spoiled: ${newlySpoiled.join(", ")}\n`)
        }

        if(!active){
            process.stdout.write("\n[Parallel] All batches spoiled. Monitor stopped.\n")
            clearInterval(monitor)
            monitor = null
        }

    }, 5000)
}

async function checkInventoryParallel(){

    await new Promise(resolve => setTimeout(resolve, 1500))

    const db = getDB()
    const items = await db.collection("items").find().sort({ id: 1 }).toArray()

    if(!items || items.length === 0){
        console.log("\n[Spoilage Alert] No items in inventory.")
        return
    }

    const today = new Date()

    let spoiledList = []
    let nearExpList = []

    for(let i of items){
        const batches = await db.collection("batches")
            .find({ itemId: i.id }).sort({ batchId: 1 }).toArray()

        for(let b of batches){
            const diffDays = Math.ceil((new Date(b.spoilageDate) - today) / (1000 * 60 * 60 * 24))
            if(b.quantity === 0){
                spoiledList.push(`${i.name} Batch ${b.batchId}`)
            } else if(diffDays <= 2){
                nearExpList.push(`${i.name} Batch ${b.batchId}`)
            }
        }
    }

    if(spoiledList.length > 0) console.log(`\n[Spoilage Alert] ❌ Spoiled: ${spoiledList.join(", ")}`)
    if(nearExpList.length > 0) console.log(`[Spoilage Alert] ⚠️  Near Expiry: ${nearExpList.join(", ")}`)
    if(spoiledList.length === 0 && nearExpList.length === 0) console.log("\n[Spoilage Alert] ✅ All items are fresh.")

    console.log("\n[Inventory Status]")
    console.log("────────────────────────────────────────────────────────────────────")
    console.log("| ID | Name               | Batch | Spoilage Date  | Status        |")
    console.log("────────────────────────────────────────────────────────────────────")

    for(let i of items){
        const batches = await db.collection("batches")
            .find({ itemId: i.id }).sort({ batchId: 1 }).toArray()

        batches.forEach(b => {
            const spoilDate = new Date(b.spoilageDate)
            const diffDays  = Math.ceil((spoilDate - today) / (1000 * 60 * 60 * 24))

            let status = ""
            if(b.quantity === 0)     status = "Spoiled"
            else if(diffDays <= 2)   status = "Near Exp"
            else                     status = "Fresh"

            const id       = String(i.id).padEnd(2)
            const name     = i.name.padEnd(18)
            const batch    = String(b.batchId).padEnd(5)
            const spoilStr = b.spoilageDate.padEnd(14)
            const stat     = status.padEnd(13)

            console.log(`| ${id} | ${name} | ${batch} | ${spoilStr} | ${stat} |`)
        })
    }

    console.log("────────────────────────────────────────────────────────────────────")
}

module.exports = { startSpoilageMonitor, checkInventoryParallel }