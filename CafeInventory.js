const { getDB } = require("./db")//lahat ng functionalities

class CafeInventory {

    async addItem(id, name, quantity, spoilageDate){
        const db = getDB()

        id = Number(id)

        // kung taken yung ID 
        let existingId = await db.collection("items").findOne({ id })
        if(existingId){
            console.log(`ID ${id} is already taken. Please use a different ID.`)
            return false
        }

        // kung taken yung name
        let existingName = await db.collection("items").findOne({ name })
        if(existingName){
            console.log(`${name} already exists. Use Restock to add more quantity.`)
            return false
        }

        await db.collection("items").insertOne({ id, name })

        await db.collection("batches").insertOne({
            batchId: 1,
            itemId: id,
            quantity,
            spoilageDate,
            totalSpoiled: 0
        })

        return true
    }

    async searchById(id){
        const db = getDB()
        return await db.collection("items").findOne({ id })
    }

    async restockItem(id, quantity, spoilageDate){//for restock 
        const db = getDB()

        
        let item = await db.collection("items").findOne({ id })
        if(!item){
            console.log(`No item found with ID ${id}.`)
            return false
        }

   
        const lastBatch = await db.collection("batches")
            .findOne({ itemId: id }, { sort: { batchId: -1 } })

        const nextBatchId = lastBatch ? lastBatch.batchId + 1 : 1

        await db.collection("batches").insertOne({
            batchId: nextBatchId,
            itemId: id,
            quantity,
            spoilageDate,
            totalSpoiled: 0
        })

        console.log(`✅ Restocked ${quantity} of ${item.name} (ID: ${id}) | Batch ${nextBatchId} | Spoilage: ${spoilageDate}`)
        return true
    }

    async deleteItem(id, batchId){//for deleting 
        const db = getDB()

        let item = await db.collection("items").findOne({ id })
        if(!item){
            console.log(`No item found with ID ${id}.`)
            return false
        }

        let batch = await db.collection("batches").findOne({ itemId: id, batchId })
        if(!batch){
            console.log(`No Batch ${batchId} found for Item ID ${id}.`)
            return false
        }

        await db.collection("batches").deleteOne({ itemId: id, batchId })

       
        const remaining = await db.collection("batches").countDocuments({ itemId: id })
        if(remaining === 0){
            await db.collection("items").deleteOne({ id })
            console.log(`No more batches left — ${item.name} fully removed.`)
        }

        return true
    }

    async deleteAllBatches(id){//for deleting all batches 
        const db = getDB()

        let item = await db.collection("items").findOne({ id })
        if(!item){
            console.log(`No item found with ID ${id}.`)
            return false
        }

        
        await db.collection("batches").deleteMany({ itemId: id })

       
        await db.collection("items").deleteOne({ id })

        console.log(`All batches and item ${item.name} (ID: ${id}) fully removed.`)
        return true
    }

async updateSpoilage(){//new added 
    const db = getDB()
   const now = new Date()
    const todayStr = now.getFullYear() + "-" +
        String(now.getMonth() + 1).padStart(2, "0") + "-" +
        String(now.getDate()).padStart(2, "0")

    const batches = await db.collection("batches").find().toArray()

    for(let b of batches){
        if(b.spoilageDate <= todayStr && b.quantity > 0){
            await db.collection("batches").updateOne(
                { _id: b._id },
                {
                    $inc: { totalSpoiled: b.quantity },
                    $set: { quantity: 0 }
                }
            )
        }
    }
}
    async showInventory(){//show inventory 
        const db = getDB()

        await this.updateSpoilage()//Calling update spoilage 
        const items = await db.collection("items").find().sort({ id: 1 }).toArray()

        if(items.length === 0){
            console.log("\nNo items in inventory.")
            return
        }

        const today = new Date()

        for(let i of items){
            const batches = await db.collection("batches")
                .find({ itemId: i.id }).sort({ batchId: 1 }).toArray()

            let totalQty     = 0
            let totalRestock = 0
            let totalSpoiled = 0

            console.log(`\n[ID: ${i.id}] ${i.name}`)
            console.log("  ┌──────────────────────────────────────────────────────────────┐")
            console.log("  | Batch | Quantity | Spoilage Date  | Spoiled  | Status        |")
            console.log("  ├──────────────────────────────────────────────────────────────┤")

            batches.forEach((b, index) => {
                const spoilDate = new Date(b.spoilageDate)
                const diffDays  = Math.ceil((spoilDate - today) / (1000 * 60 * 60 * 24))
                const now = new Date()
                const todayStr = now.getFullYear() + "-" +
                    String(now.getMonth() + 1).padStart(2, "0") + "-" +
                    String(now.getDate()).padStart(2, "0")
                let status = ""
                if(b.spoilageDate <= todayStr)   status = "❌ Spoiled"
                else if(diffDays <= 2)           status = "⚠️ Near Exp"
                else                             status = "✅ Fresh"

                    const displayQty     = b.quantity
                    const displaySpoiled = b.totalSpoiled//new added

                const batch    = String(b.batchId).padEnd(5)
                const qty      = String(displayQty).padEnd(8)
                const spoilStr = b.spoilageDate.padEnd(14)
                const spoiled  = String(displaySpoiled).padEnd(8)

                console.log(`  | ${batch} | ${qty} | ${spoilStr} | ${spoiled} | ${status}`)

                totalQty     += displayQty
                totalSpoiled += displaySpoiled
                totalRestock += b.quantity//new debug 
            })

            console.log("  └──────────────────────────────────────────────────────────────┘")
            console.log(`  Total Quantity: ${totalQty} | Total Restocked: ${totalRestock} | Total Spoiled: ${totalSpoiled}\n`)
        }
    }

    async computeTotals(){
        const today = new Date()
        const db = getDB()
        const items = await db.collection("items").find().sort({ id: 1 }).toArray()

        if(items.length === 0){
            console.log("\nNo items found in inventory.")
            return
        }

        let grandQty     = 0
        let grandRestock = 0
        let grandSpoiled = 0

        console.log("\n=================================")
        console.log("        INVENTORY REPORT")
        console.log("=================================")
        console.log("────────────────────────────────────────────────────────────────────────")
        console.log("| ID | Name               | Tot.Quantity | Tot.Restocked | Tot.Spoiled |")
        console.log("────────────────────────────────────────────────────────────────────────")

        for(let i of items){
            const batches = await db.collection("batches")
                .find({ itemId: i.id }).sort({ batchId: 1 }).toArray()

            let totalQty     = 0
            let totalRestock = 0
            let totalSpoiled = 0

            batches.forEach((b, index) => {
               const now = new Date()
            const todayStr = now.getFullYear() + "-" +
                String(now.getMonth() + 1).padStart(2, "0") + "-" +
                String(now.getDate()).padStart(2, "0")
                const isSpoiled = b.spoilageDate <= todayStr

                const displayQty     = b.quantity
                const displaySpoiled = b.totalSpoiled || 0

                totalQty     += displayQty
                totalSpoiled += displaySpoiled
                totalRestock += b.quantity//new debug 
            })
            const id      = String(i.id).padEnd(2)
            const name    = i.name.padEnd(18)
            const qty     = String(totalQty).padEnd(12)
            const restock = String(totalRestock).padEnd(13)
            const spoiled = String(totalSpoiled).padEnd(11)

            console.log(`| ${id} | ${name} | ${qty} | ${restock} | ${spoiled} |`)

            grandQty     += totalQty
            grandRestock += totalRestock
            grandSpoiled += totalSpoiled
        }

        console.log("────────────────────────────────────────────────────────────────────────")
        console.log(`| ${"TOTAL".padEnd(4)} | ${"".padEnd(18)} | ${String(grandQty).padEnd(12)} | ${String(grandRestock).padEnd(13)} | ${String(grandSpoiled).padEnd(11)} |`)
        console.log("────────────────────────────────────────────────────────────────────────")

        console.log("\n📦 Total Inventory  :", grandQty,     "units")
        console.log("🔄 Total Restocked  :", grandRestock,  "units")
        console.log("🗑️  Total Spoiled    :", grandSpoiled,  "units")
        const total = grandQty + grandSpoiled

        const spoilageRate = total > 0
            ? ((grandSpoiled / total) * 100).toFixed(2)
            : "0.00"

        console.log("📊 Spoilage Rate    :", spoilageRate + "%")
        console.log("=================================")
    }

    async searchItem(name){
        const db = getDB()
        return await db.collection("items").findOne({ name })
    }
}

module.exports = CafeInventory