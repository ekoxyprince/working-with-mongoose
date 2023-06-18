const Product = require('../models/product');
const Order = require('../models/order');
const fs = require('fs')
const path = require('path')
const ITEMS_PER_PAGE = 2
const tryCatch = require('../util/trycatch')
const pdfDocument = require('pdfkit')
const stripe = require('stripe')('sk_test_key')
exports.getProducts = (req, res, next) => {
  Product.find()
    .then(products => {
      console.log(products);
      res.render('shop/product-list', {
        prods: products,
        pageTitle: 'All Products',
        path: '/products',
      });
    })
    .catch(err => {
      console.log(err);
    });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      res.render('shop/product-detail', {
        product: product,
        pageTitle: product.title,
        path: '/products',
      });
    })
    .catch(err => console.log(err));
};

exports.getIndex = tryCatch(async(req,res,next)=>{
  const {page} = req.query
  const countDoc = await Product.find().count()
  const products = await Product.find().skip((page-1)*ITEMS_PER_PAGE).limit(2)
  res.render('shop/index', {
    prods: products,
    pageTitle: 'Shop',
    path: '/',
    page:page,
    isAuthenticated:req.session.isLoggedIn,
    count:Math.ceil(countDoc/ITEMS_PER_PAGE)
  });
})
// exports.getIndex = async(req, res, next) => {
//   const {page} = req.query
//   Product.find()
//   .skip((page-1)*ITEMS_PER_PAGE)
//   .limit(2)
//     .then(products => {
//       res.render('shop/index', {
//         prods: products,
//         pageTitle: 'Shop',
//         path: '/',
//         isAuthenticated:req.session.isLoggedIn,
//       });
//     })
//     .catch(err => {
//       console.log(err);
//     });
// };

exports.getCart = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items;
      res.render('shop/cart', {
        path: '/cart',
        pageTitle: 'Your Cart',
        products: products,
      });
    })
    .catch(err => console.log(err));
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then(product => {
      return req.user.addToCart(product);
    })
    .then(result => {
      console.log(result);
      res.redirect('/cart');
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then(result => {
      res.redirect('/cart');
    })
    .catch(err => console.log(err));
};

exports.postOrder = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items.map(i => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user
        },
        products: products
      });
      return order.save();
    })
    .then(result => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect('/orders');
    })
    .catch(err => console.log(err));
};

exports.getOrders = (req, res, next) => {
  Order.find({ 'user.userId': req.user._id })
    .then(orders => {
      res.render('shop/orders', {
        path: '/orders',
        pageTitle: 'Your Orders',
        orders: orders,
      });
    })
    .catch(err => console.log(err));
};


exports.getInvoice = (req,res,next)=>{
  const {orderId} = req.params
  const orderName = `invoice-${orderId}.pdf`
  const invoicePath = path.join('public','static',orderName)
  // fs.readFile(invoicePath,(err,data)=>{
  //   if(!err){
  //     res.header('Content-Type','application/pdf')
  //     res.header('Content-Disposition','attachment; filename="invoice.pdf"')
  //     res.send(data)
  //   }
  // })
  // const file = fs.createReadStream(invoicePath)
  // file.pipe(res)
  const pdfDoc = new pdfDocument()
  res.setHeader('Content-Type','application/pdf')
  res.setHeader('Content-Disposition','attachment; filename="'+orderName+'"')
  pdfDoc.pipe(fs.createWriteStream(invoicePath))
  pdfDoc.pipe(res)
  pdfDoc.fontSize(26).text("Order Invoice Summary",{
    underline:true
  })
  pdfDoc.fontSize(12).text('This is your invoice summary')
  pdfDoc.end()
}


exports.getCheckout = (req,res,next)=>{
  let products;
  let total = 0;
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
       products = user.cart.items;
       total = 0;
      for (const prod of products) {
        total+=prod.quantity*prod.productId.price
      }
      return stripe.customers.create({
        email : req.user.email,
      })
     })
      .then((customer)=>{
      return stripe.invoiceItems.create({
        customer: customer.id, // set the customer id
        amount: total *100, // 25
        currency: 'usd',
        description: 'Payment for goods bought'})
    })
  
    .then(invoiceItems=>{
      console.log(products)
      res.render('shop/checkout', {
        path: '/checkout',
        pageTitle: 'Checkout',
        products: products,
        totalSum:total,
        items:invoiceItems
      });
    })
    .catch(err => console.log(err));
}
// exports.postCheckout = async (req, res) => {
//   const { items } = req.body;

//   // Create a PaymentIntent with the order amount and currency
//   const paymentIntent = await stripe.paymentIntents.create({
//     amount: 200,
//     currency: "usd",
//     automatic_payment_methods: {
//       enabled: true,
//     },
//   });
// console.log(paymentIntent.client_secret)
//   res.json({
//     clientSecret: paymentIntent.client_secret,
//   });
// }
exports.createPaymentIntent = (req,res,next)=>{
  let products;
  let total = 0;
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
       products = user.cart.items;
       total = 0;
      for (const prod of products) {
        total+=prod.quantity*prod.productId.price
      }
      return stripe.paymentIntents.create({
        amount:total*100,
        currency:'usd',
        automatic_payment_methods:{
          enabled:true
        }
      })
     })
     .then(paymentIntent=>{
      res.status(201).send({clientSecret:paymentIntent.client_secret})
     })
     .catch(error=>{
      console.log(error)
     })
}
exports.checkoutSuccess = (req,res,next)=>{
  res.send(req.query)
}