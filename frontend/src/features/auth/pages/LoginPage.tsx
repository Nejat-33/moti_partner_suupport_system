import React, { useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { AuthService } from "../service/authService";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Link } from "react-router-dom";


interface LoginFormData {
    email: string;
    password: string;
}

export default function Login() {
    const { login } = useAuth();

    const [formData, setFormData] = useState<LoginFormData>({
        email: "",
        password: ""
    });

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [isSuccess, setIsSuccess] = useState<boolean>(false);
    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);

        if (!formData.email || !formData.password) {
            setError("Please fill in all required fields.");
            return;
        }

        setLoading(true);

        try {
            const response = await AuthService.login({ email: formData.email, password: formData.password });
            const { accessToken, partyType } = response.data;

            localStorage.setItem("jwt_token", accessToken);

            const minimalUser = {
                id: "",
                fullName: "",
                email: formData.email,
                role: partyType || "",
            };

            setIsSuccess(true);

            setTimeout(() => {
                login(minimalUser);
                navigate("/dashboard");
            }, 1000);

        } catch (err: unknown) {
            console.error("Login failed", err);

            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.message ?? "Login failed.");
            } else if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Login failed. Please verify your credentials.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-8 font-sans selection:bg-[#5182c4] selection:text-white relative overflow-hidden">

            <div className={`absolute inset-0 bg-white flex flex-col justify-center items-center z-50 transition-all duration-500 ease-in-out ${isSuccess ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none translate-y-4"}`}>
                <div className="flex flex-col items-center max-w-sm text-center px-6">

                    <div className="h-20 w-20 bg-green-50 rounded-full flex items-center justify-center border border-green-200 text-green-500 mb-6 animate-bounce">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-10 h-10">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                    </div>

                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">
                        Welcome Back!
                    </h2>
                    <p className="text-sm text-slate-500">
                        Authentication verified successfully. Setting up your workspace dashboard...
                    </p>
                    <div className="mt-6 flex space-x-1 justify-center items-center">
                        <div className="w-2 h-2 bg-[#5182c4] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-[#5182c4] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-[#5182c4] rounded-full animate-bounce"></div>
                    </div>
                </div>
            </div>


            <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-xl">

                <div className="mb-8 text-center flex flex-col items-center">
                    <img
                        src="\New Picture.png"
                        alt="Moti Engineering Logo"
                        className="h-28 w-lg mb-2 object-contain"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                    {/* <h1 className="text-xl font-bold tracking-widest text-[#5182c4] uppercase">
                        Moti Engineering
                    </h1> */}
                    <p className="text-xs font-bold tracking-wider text-slate-400 uppercase mt-0.5">
                        Sign In
                    </p>
                </div>

                {error && (
                    <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="bg-slate-50/50 border border-slate-100 p-5 rounded-xl space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                Email Address
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="yourname@example.com"
                                required
                                disabled={loading}
                                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#5182c4] focus:ring-4 focus:ring-[#5182c4]/10 transition-all duration-200 shadow-sm disabled:opacity-60"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                                    Password
                                </label>
                                <a href="#forgot" className="text-xs font-bold text-[#5182c4] hover:underline">
                                    Forgot?
                                </a>
                            </div>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                required
                                disabled={loading}
                                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#5182c4] focus:ring-4 focus:ring-[#5182c4]/10 transition-all duration-200 shadow-sm disabled:opacity-60"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#5182c4] hover:bg-[#436fa8] text-white font-bold text-sm rounded-xl py-3 mt-2 transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-[#5182c4]/30 disabled:bg-slate-400 disabled:cursor-not-allowed"
                    >
                        {loading ? "Verifying Credentials..." : "Sign In to Account"}
                    </button>
                </form>

                <div className="mt-6 text-center text-xs text-slate-400">
                    Don't have an account?{" "}
                    <Link to="" className="text-[#5182c4] hover:underline font-bold">
                        Create an Account
                    </Link>
                </div>

            </div>
        </div>
    );
}