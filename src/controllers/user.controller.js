import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import User from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessAndRefreshToken = async (userId){
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
    const {email, username, password} = req.body;
    if(!usename || !email){
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

export { registerUser, loginUser, logoutUser };
