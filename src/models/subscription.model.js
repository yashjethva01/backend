import mongoose,{Schema} from "mongoose";

const subscriptionSchema = new Schema({
    subscriber:{
        type: Schema.Types.ObjectId,//who is subscribing
        ref:"User",
        //required:true
    },
    channel:{//to whom
        type:Schema.Types.ObjectId,
        ref:"User",
        //required:true
    },
    // userId:{
    //     type:mongoose.Schema.Types.ObjectId,
    //     ref:"User",
    //     required:true,
    //     unique:true
    // },  
    // plan:{
    //     type:String,
    //     enum:["free","premium","pro"],
    //     default:"free"
    // },
    // startDate:{
    //     type:Date,  
    //     default:Date.now
    // },
    // endDate:{   
    //     type:Date
    // },
    // isActive:{  
    //     type:Boolean,
    //     default:true
    // }   
},{timestamps:true});

const Subscription = mongoose.model("Subscription", subscriptionSchema);
export default Subscription;