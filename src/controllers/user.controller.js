import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import User from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId)=>{
    try{
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});

        return {accessToken, refreshToken};
    }
    catch(error){
        throw new ApiError(500, "Token generation failed", error);   
    }
}

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists : email, username
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token from response
    // check for user created or not
    // return response


    const { fullName, email, username, password } = req.body;
    // console.log("email:", email);

    // Validate required fields
    if ([fullName, email, username, password].some(field => !field || field.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
        throw new ApiError(409, "User already exists with this email or username");
    }
    // console.log("req.files:", req.files);


    // Handle file upload
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    //const coverImageLocalPath = req.files?.coverImages?.[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImages) && req.files.coverImages.length > 0){
        coverImageLocalPath = req.files.coverImages[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    let coverImage;
    if (coverImageLocalPath) {
        coverImage = await uploadOnCloudinary(coverImageLocalPath);
    }

    if (!avatar) {
        throw new ApiError(400, "Failed to upload avatar");
    }

    // Create user
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImages: coverImage?.url || "",
        email,
        username: username.toLowerCase(),
        password
    });

    // Fetch created user without password/refresh token
    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if (!createdUser) {
        throw new ApiError(500, "User not created, please try again");
    }

    return res.status(201).json(new ApiResponse(201, "User created successfully", createdUser));
});

const loginUser = asyncHandler(async (req, res) => {
    // req body -> data
    // username or password
    // find user
    //password check
    // access token, refresh token
    // send cookie
    console.log("req.body:", req.body);
    if (!req.body) {
        return res.status(400).json({ error: "Request body is missing. Check your Content-Type and request format." });
    }

    const {email, username, password} = req.body;
    console.log(email);

    if(!username && !email){
        throw new ApiError(400, "Username or email required");
    }

    const user = await User.findOne({$or: [{email}, {username}]})
        if(!user){
            throw new ApiError(404, "User not found with this email or username");
        }   
        
        const isPasswordValid = await user.isPasswordCorrect(password);
        if(!isPasswordValid){
            throw new ApiError(401, "Password is incorrect");
        }

       const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

       const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
    
        const options = {
            httpOnly: true,
            secure:true
        }
        return res
        .status(200)
        .cookie("refreshToken", refreshToken, options)
        .cookie("accessToken", accessToken, options)
        .json(
            new ApiResponse(200, "User logged in successfully", 
                {
                    user: loggedInUser, accessToken, refreshToken
                }
            )
        );
});


const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id, 
        {
            $set: {
                refreshToken: undefined
            }
        }, 
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure:true
    }

    return res
        .status(200)
        .cookie("refreshToken", options)
        .cookie("accessToken", options)
        .json(new ApiResponse(200,{}, "User logged out successfully"));

})


const refreshAccessToken = asyncHandler(async (req, res) =>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if(!incomingRefreshToken){
        throw new ApiError(400, "Refresh token is required");
    }

try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken?._id);
        if(!user){
            throw new ApiError(401, "Not authorized, user not found");
        }
        if(user?.refreshToken !== incomingRefreshToken){
            throw new ApiError(401, "Refresh Token is expired, token mismatch");
        }
    
        const options = {
            httpOnly: true,
            secure:true
        }
    
        const {accessToken, newrefreshToken} = await generateAccessAndRefreshToken(user._id)
    
        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newrefreshToken, options)
            .json(new ApiResponse(200, {accessToken, refreshToken: newrefreshToken}, "Access token generated successfully"));
} catch (error) {
    throw new ApiError(401, error?.message || "Invalide refresh token, token failed");
}
})


const changeCurrentPassword = asyncHandler(async (req, res) => {
    // get user id from req.user
    // get old password, new password from req.body
    // find user from db
    // check old password is correct or not
    // if not correct, throw error
    // if correct, update with new password
    // save user
    // send response
    const userId = req.user._id;
    const { oldPassword, newPassword } = req.body;  
    if (!oldPassword || !newPassword) {
        throw new ApiError(400, "Old password and new password are required");
    }
    const user = await User.findById(req.user?._id)
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    const isOldPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isOldPasswordCorrect) {
        throw new ApiError(401, "Old password is incorrect");
    }
    user.password = newPassword;
    await user.save({validateBeforeSave: false});
    return res
    .status(200)
    .json(new ApiResponse(200, "Password changed successfully"));
}
)


const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, "Current user fetched successfully", req.user));
})


const updateAccountDetails = asyncHandler(async (req, res) => {
    // get user id from req.user
    // get details from req.body
    // find user from db
    // update user details
    // save user
    // send response
    const userId = req.user._id;
    const { fullName, email} = req.body;
    if (!fullName && !email) {
        throw new ApiError(400, "At least one field is required to update");
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        { new: true, }
    ).select("-password ");  
    
    return res
        .status(200)
        .json(new ApiResponse(200, "User details updated successfully", user));
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    // get user id from req.user
    // get avatar from req.files
    // find user from db
    // upload avatar to cloudinary
    // update user avatar
    // save user
    // send response
    const userId = req.user._id;
    const avatarLocalPath = req.file?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required");
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar.url) {
        throw new ApiError(400, "Failed to upload avatar");
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true, }
    ).select("-password ");
    return res
        .status(200)
        .json(new ApiResponse(200, "User avatar updated successfully", user));
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    // get user id from req.user
    // get cover image from req.files
    // find user from db
    // upload cover image to cloudinary
    // update user cover image
    // save user
    // send response
    const userId = req.user._id;
    const coverImageLocalPath = req.file?.path;
    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image is required");
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!coverImage.url) {
        throw new ApiError(400, "Failed to upload cover image");
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImages: coverImage.url
            }
        },
        { new: true, }
    ).select("-password "); 
    return res
        .status(200)
        .json(new ApiResponse(200, "User cover image updated successfully", user));
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    // get user id from req.params
    // find user from db    
    // send response
    const {username} = req.params;

    if(!username?.trim()){
        throw new ApiError(400, "Username is required");
    }
    
    const channel = await User.aggregate([
        {
            $match: { username: username?.toLowerCase() }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }   
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }   
        },
        {
            $addFields: {
                subscriberCount: { $size: "$subscribers" },
                channelsSubscribedToCount: { $size: "$subscribedTo" },
                isSubscribed: { 
                    $cond:{
                        if:{$in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }

        },
        { 
            $project: { 
                fullName: 1, 
                username: 1, 
                email: 1,
                avatar: 1, 
                coverImages: 1, 
                subscriberCount: 1, channelsSubscribedToCount: 1, isSubscribed: 1,
                createdAt: 1, 
                updatedAt: 1,                
                password: 0,
                refreshToken: 0

               } }
    ])

    if(!channel || channel.length === 0){
        throw new ApiError(404, "Channel not found with this username");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, "Channel profile fetched successfully", channel[0]));

})

const getWatchHistory = asyncHandler(async (req, res) => {
    // get user id from req.user
    // find user from db    
    // send response
    const userId = req.user?._id;

    const user = await User.aggregate([
        {
            $match: { 
                _id: new mongoose.Types.ObjectId(req.userId)
            }

        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup:{
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline:[
                                { $project: { fullName: 1, username: 1, 
                                avatar: 1, 
                                _id: 1 
                            } }
                            ]

                        }
                    },
                    {
                        $addFields:{
                            owner: { 
                                $first: "$owner"
                             }
                        }
                    }
                ]
            }
        }
    ])
    
    if(!user || user.length === 0){
        throw new ApiError(404, "User not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, "Watch history fetched successfully", user[0].watchHistory));
})



export { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory };
