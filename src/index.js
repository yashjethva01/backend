// require("dotenv").config({path: "./.env"});
import dotenv from "dotenv";

import mongoose from "mongoose";
import { DB_NAME } from "./constants.js";
import connectDB from "./db/index.js";

dotenv.config({ 
    path: "./.env"
});


connectDB();
.then(() => {
    app.listen(process.env.PORT, () => {
        console.log(`Server started on port ${process.env.PORT}`);
    })     
} ) 
.catch((err) => {
    console.error("Error connecting to MongoDB:", err);   
    throw err;
});
















/*
(async () => {
  try {
    await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`)
    app.on("error", (err) => {
      console.log("Server error:", err);
      throw err;
    } )

    app.listen(process.env.PORT, () => {
    console.log(`Server started on port ${process.env.PORT}`);
    });
  
  }  
  


  catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
}
})()
*/