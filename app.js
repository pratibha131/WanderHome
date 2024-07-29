const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const {listingSchema , reviewSchema} = require("./schema.js");
const Review = require("./models/review.js");
const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";

main()
.then(()=>{
    console.log("connected to DB");
})
.catch((err)=>{
    console.log("there is err");
});
async function main(){
    await mongoose.connect(MONGO_URL);
}

app.set("view engine" , "ejs");
app.set("views" , path.join(__dirname , "views"));
app.use(express.urlencoded({extended:true}));
app.use(methodOverride("_method"));
app.engine("ejs" , ejsMate);
app.use(express.static(path.join(__dirname , "/public")));

app.get("/",(req,res)=>{
    res.send("hi im root");
});


// validation of schema using middlewares 
const validateListing = (req,res,next) =>{
    let {error} = listingSchema.validate(req.body);
        let errMsg = error.details.map((el)=>
            el.message).join(",");
        if(error){
            throw new ExpressError(400,errMsg);
        }else{
            next();
        }
}

const validateReview = (req,res,next) =>{
    let {error} = reviewSchema.validate(req.body);
    if(error){
        let errMsg = error.details.map((el)=>el.message).join(",");
        throw new ExpressError(400,errMsg);
    }else{
        next();
    }
}



//index route
app.get("/listings" , wrapAsync(async(req,res)=>{
    const allListings = await Listing.find({}) ;
    res.render("listings/index.ejs" , ({allListings}));

}));

// new route
app.get("/listings/new" , (req,res)=>{
    res.render("listings/new.ejs");
});

// error in this route
app.use((err, req,res,next)=>{
    let {status = 400 , message="err ocuured"} = err;
    res.status(status).send(message);
});

//show route 
app.get("/listings/:id" , wrapAsync(async(req , res)=>{
    let {id} = req.params;
    const listing = await Listing.findById(id).populate("reviews");
    res.render("listings/show.ejs" , {listing});
}));

// create route - in this validateListing is the middleware to handle validate schema
app.post("/listings" , wrapAsync(async(req,res,next)=>{
    // joi is used to validate our schema in the case we have used if consitions it is used for schema validate 
        // if(!req.body.listing){
        //     throw new ExpressErrorError(404 , "listing is required");
        // }
        let result = listingSchema.validate(req.body);
        console.log(result);
        if(result.error){
            throw new ExpressError(400,result.error);
        }
        const newListing =new Listing(req.body.listing);
        // if(!newListing.description){
        //     throw new ExpressErrorError(404 , "Description is required");
        // }
        // if(!newListing.title){
        //     throw new ExpressErrorError(404 , "Title is required");
        // }
        // if(!newListing.location){
        //     throw new ExpressErrorError(404 , "Location is required");
        // }
        // if(!newListing.country){
        //     throw new ExpressErrorError(404 , "Country is required");
        // }
        await newListing.save();
        res.redirect("/listings");
    })
);

// edit route
app.get("/listings/:id/edit",wrapAsync(async(req,res)=>{
        let {id} = req.params;
        const listing = await Listing.findById(id);
        res.render("listings/edit.ejs" , {listing});
        res.redirect(`/listings/${id}`);
}));

// update route
app.put("/listings/:id" , validateListing , wrapAsync(async(req,res)=>{
    let { id } = req.params;
    await Listing.findByIdAndUpdate(id , {...req.body.listing});
    res.redirect(`/listings/${id}`);
}));

// delete route 
app.delete("/listings/:id" , wrapAsync(async(req,res)=>{
    let {id} = req.params;
    let deletedListing = await Listing.findByIdAndDelete(id);
    console.log(deletedListing);
    res.redirect("/listings");
}));

// reviews
app.post("/listings/:id/reviews" , validateReview , wrapAsync(async(req,res)=>{
    let listing = await Listing.findById(req.params.id);
    let newReview = new Review(req.body.review);

    listing.reviews.push(newReview);
    await newReview.save();
    await listing.save();

    console.log("new review saved");
    res.redirect(`/listings/${listing._id}`);
}));

// delete review route
app.delete("/listings/:id/reviews/:reviewID" , wrapAsync(async(req,res)=>{
    let {id , reviewID} = req.params ;

    await Listing.findByIdAndUpdate(id , {$pull :{reviews : reviewID}});
    await Review.findByIdAndDelete(reviewID);

    res.redirect(`/listings/${id}`);
}))

// app.get("/testListing" , async(req,res)=>{
//     let sampleListing = new Listing({
//         title :"My Villa",
//         description : "By the beach",
//         image : "https://unsplash.com/photos/the-eiffel-tower-towering-over-the-city-of-paris-T_C-60d1Zz4",
//         price:1200,
//         location: "Calangute , Goa",
//         country : "India",
//     });
//     await sampleListing.save();
//     console.log("sample saved");
//     res.send("successful testing");

// });


app.all("*" , (req,res,next)=>{
    next(new ExpressError(404,"Page not found"));
});

// error handling middleware
//middle to handle on client side error  
app.use((err,req,res,next)=>{
    let {status=500 , message="Something went wrong"} = err;
    res.render("error.ejs",{message});
    // res.status(status).send(message);
});

app.listen(8080, ()=>{
    console.log("server is listening to 8080");
});



