
class InventoryItem {//OOP
    constructor(name, quantity, spoilageDate){
        this.name = name
        this.quantity = quantity
        this.spoilageDate = spoilageDate
        this.totalRestocked = 0
        this.totalSpoiled = 0
    }

    restock(amount){
        this.quantity += amount
        this.totalRestocked += amount
    }

    spoil(){
        this.totalSpoiled += this.quantity
        this.quantity = 0
    }

    getQuantity(){
        return this.quantity
    }

    getStats(){
        return {
            quantity: this.quantity,
            restocked: this.totalRestocked,
            spoiled: this.totalSpoiled
        }
    }
}

module.exports = InventoryItem