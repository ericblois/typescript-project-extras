import * as admin from "firebase-admin"
import * as functions from "firebase-functions";
import { OrderData, CartItem, PrivateBusinessData, ProductData, ShippingInfo, } from "./DataTypes";

admin.initializeApp();

const firestore = admin.firestore()

//const uniqueID = require('order-id')('mysecret');

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

const generateOrderID = () => {
    const now = new Date()
    const date = now.toISOString().replace(/\D/g, '').substring(4)
    const rand = Math.round(Math.random()*900 + 100).toString()
    const num = parseInt(rand.concat(date))
    let orderID = num.toString(36).toUpperCase()
    while (orderID.length < 12) {
      const randSymbol = Math.round(Math.random()*35).toString(36).toUpperCase()
      orderID = randSymbol.concat(orderID)
    }
    return orderID
}

const getProduct = async (productID: string, businessID: string) => {
    try {
        // ONLY FOR CANADA CURRENTLY //
        const docPath = "publicBusinessData/canada/businesses/".concat(businessID).concat("/products/").concat(productID)
        const productDocRef = firestore.doc(docPath)
        const productData = await productDocRef.get()
        if (productData.exists) {
            return productData.data() as ProductData
        } else {
            throw new Error("Could not find product ID: ".concat(productID).concat(", from business ID: ".concat(businessID)))
        }
    } catch (e) {
        throw e
    }
}

const getCartPrice = async (cartItems: CartItem[]) => {
    try {
        // Get product data of each cart item
        const products = await Promise.all(cartItems.map((item) => {
            return getProduct(item.productID, item.businessID)
        }))
        // Get total price of cart items
        let cartTotal = 0
        cartItems.forEach((item, index) => {
            // Find corresponding product data and get price
            const productData = products[index]
            if (productData.productID !== item.productID) {
                throw new Error("Encountered a misalignment between a cart item and a product")
            } else if (productData.price === null) {
                throw new Error("Product ID: ".concat(item.productID).concat(" has no price"))
            }
            // Get price changes from option selections
            let priceChange = 0
            Object.entries(item.productOptions).forEach(([typeName, selection]) => {
                // Find the corresponding option type
                const optionType = productData.optionTypes.find((optionType) => {
                    return optionType.name === typeName
                })
                if (!optionType) {
                    throw new Error("Could not find option type: ".concat(typeName).concat(", on product ID: ").concat(item.productID))
                }
                // Find the corresponding option
                const option = optionType.options.find((option) => {
                    return option.name === selection.optionName
                })
                if (!option) {
                    throw new Error("Could not find option: ".concat(typeName).concat(", on product ID: ").concat(item.productID))
                }
                priceChange += option.priceChange ? option.priceChange : 0
            })
            // Get total price
            cartTotal += productData.price + priceChange
        })
        return cartTotal
    } catch (e) {
        throw e
    }
}
// Called by a customer to place an order
export const createOrder = functions.https.onCall(async (orderInfo: {
        businessID: string,
        cartItems: CartItem[],
        shippingInfo: ShippingInfo,
        deliveryMethod: OrderData["deliveryMethod"],
        deliveryPrice: number
    }, context) => {
    try {
        if (context.auth) {
            // Get info for order
            const orderPrice = await getCartPrice(orderInfo.cartItems)
            const orderID = generateOrderID()
            const today = new Date()
            const dateString = today.toUTCString()
            // Create customer order object
            const orderData: OrderData = {
                businessID: orderInfo.businessID,
                userID: context.auth.uid,
                orderID: orderID,
                cartItems: orderInfo.cartItems,
                subtotalPrice: orderPrice,
                totalPrice: orderPrice * 1.13,
                deliveryMethod: orderInfo.deliveryMethod,
                deliveryPrice: orderInfo.deliveryPrice,
                creationTime: dateString,
                responseTime: null,
                completionTime: null,
                status: "pending"
            }
            // Get paths to customer and business orders
            const customerOrderPath = `userData/${context.auth}/orders/${orderID}`
            const businessOrderPath = `privateBusinessData/${orderInfo.businessID}/orders/${orderID}`
            await firestore.runTransaction(async (transaction) => {
                // Create order documents
                transaction.set(firestore.doc(customerOrderPath), orderData)
                transaction.set(firestore.doc(businessOrderPath), orderData)
            })
        }
    } catch (e) {
        throw e
    }
})
// Called by a business to respond to an order
export const respondToOrder = functions.https.onCall(async (orderInfo: {
        businessID: string,
        orderID: string,
        acceptOrder: boolean
    }, context) => {
        try {
            if (context.auth) {
                // Get private business data
                const privateBusinessPath = `privateBusinessData/canada/businesses/${orderInfo.businessID}`
                const privateDataSnap = await firestore.doc(privateBusinessPath).get()
                if (!privateDataSnap.exists) {
                    throw new functions.https.HttpsError("not-found", `Could not find business ID: ${orderInfo.businessID}`)
                }
                const privateData = privateDataSnap.data()! as PrivateBusinessData
                // Check permissions
                if (privateData.userID !== context.auth.uid) {
                    throw new functions.https.HttpsError("permission-denied", "This user is not authorized to make this action")
                }
                // Get business and customer order doc references
                const businessOrderPath = `privateBusinessData/${privateData.country}/${orderInfo.businessID}/orders/${orderInfo.orderID}`
                const businessOrderDocRef = firestore.doc(businessOrderPath)
                const orderDocSnap = await businessOrderDocRef.get()
                if (!orderDocSnap.exists) {
                    throw new functions.https.HttpsError("not-found", `Could not find order ID: ${orderInfo.orderID}`)
                }
                const orderDoc = orderDocSnap.data() as OrderData
                const customerOrderPath = `userData/${orderDoc.userID}/orders/${orderInfo.orderID}`
                const customerOrderDocRef = firestore.doc(customerOrderPath)
                // Update order doc
                orderDoc.status = orderInfo.acceptOrder ? "accepted" : "rejected"
                const today = new Date()
                const dateString = today.toUTCString()
                orderDoc.responseTime = dateString
                await firestore.runTransaction(async (transaction) => {
                    transaction.set(businessOrderDocRef, orderDoc)
                    transaction.set(customerOrderDocRef, orderDoc)
                })
            }
        } catch (e) {
            throw e
        }
    })
// Called by a business to complete an order
export const completeOrder = functions.https.onCall(async (orderInfo: {
    businessID: string,
    orderID: string,
    shipped: boolean
}, context) => {
    try {
        if (context.auth) {
            // Get private business data
            const privateBusinessPath = `privateBusinessData/canada/businesses/${orderInfo.businessID}`
            const privateDataSnap = await firestore.doc(privateBusinessPath).get()
            if (!privateDataSnap.exists) {
                throw new functions.https.HttpsError("not-found", `Could not find business ID: ${orderInfo.businessID}`)
            }
            const privateData = privateDataSnap.data()! as PrivateBusinessData
            // Check permissions
            if (privateData.userID !== context.auth.uid) {
                throw new functions.https.HttpsError("permission-denied", "This user is not authorized to make this action")
            }
            // Get business and customer order doc references
            const businessOrderPath = `privateBusinessData/${privateData.country}/${orderInfo.businessID}/orders/${orderInfo.orderID}`
            const businessOrderDocRef = firestore.doc(businessOrderPath)
            const orderDocSnap = await businessOrderDocRef.get()
            if (!orderDocSnap.exists) {
                throw new functions.https.HttpsError("not-found", `Could not find order ID: ${orderInfo.orderID}`)
            }
            const orderDoc = orderDocSnap.data() as OrderData
            const customerOrderPath = `userData/${orderDoc.userID}/orders/${orderInfo.orderID}`
            const customerOrderDocRef = firestore.doc(customerOrderPath)
            // Update order doc
            orderDoc.status = orderInfo.shipped ? "shipped" : "completed"
            const today = new Date()
            const dateString = today.toUTCString()
            orderDoc.completionTime = dateString
            await firestore.runTransaction(async (transaction) => {
                transaction.set(businessOrderDocRef, orderDoc)
                transaction.set(customerOrderDocRef, orderDoc)
            })
        }
    } catch (e) {
        throw e
    }
})