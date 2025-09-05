import { asyncHandler } from "../utils/asyncHandler"
import { ApiError } from "../utils/ApiError"
import jwt from "jsonwebtoken"
import User from "../models/user.model.js"


export const verifyJWT = asyncHandler(async (req, _, next) => {
try {
        const token = req.cookies.accessToken || req.header("Authorization")?.replace("Bearer ", "")
    
        if(!token){
            throw new ApiError(401, "Not authorized, token missing");
        }
        // verify token
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET)
    
        const user = await User.findById(decodedToken._id).select("-password -refreshToken")
        if(!user){
            // discuss about frontend
            throw new ApiError(401, "Not authorized, user not found");
        }
    
        req.user = user;
        next();
} catch (error) {
    throw new ApiError(401, error?.message || "Invalide access token, token failed");
    
}

})
