import { useState } from "react";
import React from "react";
import '../css/auth.css'

function Auth() {
    function handleSubmit(event) {
        console.log(event);
    }
    return (
        <>
            <main>
                <div className="center">
                    <div className="intro">
                        <p></p>
                        <h2>FactDrop</h2>
                        <h3>A new fact every time you open the app.</h3>
                        <p>Like the ones you love, and share what you think in the comments.</p>
                        <div>
                            <p>Fact of the day</p>
                            <h3>An octopus has three hearts, and two of them stop beating when it swims.</h3>
                        </div>
                    </div>
                    <div className="auth">
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
                </div>

            </main>

        </>
    )
}
export default Auth;