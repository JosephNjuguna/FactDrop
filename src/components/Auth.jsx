import { useState } from "react";
import React from "react";

function Auth() {
    function handleSubmit(event) {
        console.log(event);
    }
    return (
        <>
        <div>
            <div className="swicthAuthMode">
                <p>Sign In</p>
                <p>Sign Up</p>
            </div>
            <div className="SignUp">

            </div>
            <div className="SignIn">
                <h3>Welcome Back</h3>
                <p>Sign in to see facts picked for you.</p>
                <button>continue with github</button>
                <p>or use your email</p>
                <form onSubmit={handleSubmit}>
                    <p>Email</p>
                    <input type="text" placeholder="yor@example.com" />
                    <p>Password</p>
                    <input type="password" placeholder="enter your password" />
                    <p>Forgot password?</p>
                    <button>Sign In</button>
                    <p>New Here? <b>Create an Account</b></p>
                </form>
            </div>
        </div>
            <p>this is the auth page</p>
        </>
    )
}
export default Auth;