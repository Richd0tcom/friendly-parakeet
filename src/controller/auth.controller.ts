import { Request, Response } from "express";
import { User } from "../db/mongo/mongo"
import { createToken, decryptPassword, encryptPassword } from "../utils/auth";

export const signup = async(req: Request, res: Response):Promise<any> => {
    const signupReq = req.body
   const exists = await User.findOne({email: signupReq.email} )

   if(exists) {
     return res.status(409).json({ message: "Email already exists" });  
   }

   const hashedPassword : string = await encryptPassword(signupReq.password)

   const user = await User.create({
     email: signupReq.email,
     password: hashedPassword,
     name: signupReq.name,
   })
  return res.status(200).json({ message: "sucess", data: user }); 
}

export const login = async(req: Request, res: Response): Promise<any> => {
    const loginReq = req.body

    const user = await User.findOne({email: loginReq.email} ).select(['email', 'password'])
    
    if(!user ||!decryptPassword(loginReq.password, user.password)) {
      return res.status(401).json({ message: "Invalid email or password" });  
    }

    const token = createToken(user)
    user.password = ""

  return res.json({ message: "login",  data: user, token}); 
}