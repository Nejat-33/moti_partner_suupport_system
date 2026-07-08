import React, { useState } from "react";
import axios from "axios";
import { Axios } from "../../../utils/axios";

type GenderType = "male" | "female" | "";

interface SignupFormData {
    fullName: string;
    workEmail: string;
    gender: GenderType;
    password: string;
    confirmPassword: string;
}

export default function StaffSignup() {
    const [formData, setFormData] = useState<SignupFormData>({
        fullName: "",
        workEmail: "",
        gender: "",
        password: "",
        confirmPassword: "",
    });

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [success, setSuccess] = useState<boolean>(false);
    const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
    const [resendLoading, setResendLoading] = useState<boolean>(false);
    const [resendMessage, setResendMessage] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);

        if (!formData.gender) {
            setError("Please select your gender.");
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        const payload = {
            fullName: formData.fullName.trim(),
            email: formData.workEmail.trim().toLowerCase(),
            gender: formData.gender.toUpperCase(),
            password: formData.password,
            passwordPlain: formData.password,
        };

        try {
            const { data } = await Axios.post("/staff/register", payload);
            setRegisteredEmail(payload.email);
            setSuccess(true);
            console.log("Signup successful:", data);
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                const responseData = error.response?.data as { error?: string } | undefined;
                setError(responseData?.error ?? error.message);
            } else if (error instanceof Error) {
                setError(error.message);
            } else {
                setError("Failed to connect to the server.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (!registeredEmail) return;
        setResendLoading(true);
        setResendMessage(null);

        try {
            const { data } = await Axios.post("/staff/resend-verification", { email: registeredEmail });
            setResendMessage((data && data.message) || "Verification email resent. Check your inbox.");
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                const responseData = err.response?.data as { error?: string } | undefined;
                setResendMessage(responseData?.error ?? err.message);
            } else if (err instanceof Error) {
                setResendMessage(err.message);
            } else {
                setResendMessage("Failed to resend verification email.");
            }
        } finally {
            setResendLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 font-sans selection:bg-[#5182c4] selection:text-white">
                <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-xl text-center">

                    <div className="h-16 w-16 bg-blue-50 text-[#5182c4] rounded-full flex items-center justify-center mx-auto mb-5 text-2xl animate-bounce">
                        ✉
                    </div>

                    <h2 className="text-xl font-bold text-slate-800 mb-2">
                        Verify Your Email
                    </h2>

                    <p className="text-sm text-slate-500 leading-relaxed mb-6">
                        We've sent a verification link to your registered email address.
                        Please click the link in that email to activate your account.
                    </p>

                    <div className="space-y-3">
                        {registeredEmail && (
                            <div className="mb-2">
                                <button
                                    onClick={handleResend}
                                    disabled={resendLoading}
                                    className="w-full inline-block bg-white border border-slate-200 text-[#5182c4] font-bold text-sm rounded-xl py-3 transition-all duration-200 shadow-sm disabled:opacity-60"
                                >
                                    {resendLoading ? "Resending..." : "Resend Verification Email"}
                                </button>
                                {resendMessage && (
                                    <p className="text-xs text-slate-500 mt-2">{resendMessage}</p>
                                )}
                            </div>
                        )}
                        {/* <a
                            href="#signin"
                            className="w-full inline-block bg-[#5182c4] hover:bg-[#436fa8] text-white font-bold text-sm rounded-xl py-3 transition-all duration-200 shadow-md"
                        >
                            Go to Sign In
                        </a> */}

                        <p className="text-xs text-slate-400">
                            Didn't receive the email? Check your spam folder or contact system admin.
                        </p>
                    </div>

                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 font-sans selection:bg-[#5182c4] selection:text-white">
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-xl">

                <div className="mb-8 text-center flex flex-col items-center">
                    <img
                        src="\New Picture.png"
                        alt=""
                        className="h-28 w-auto mb-3 object-contain"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                    {/* <h1 className="text-xl font-bold tracking-widest text-[#5182c4] uppercase">
                        Moti Engineering
                    </h1> */}
                    <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase mt-1">
                        Partner Support System
                    </p>
                </div>

                {error && (
                    <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Full Name
                        </label>
                        <input
                            type="text"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleChange}
                            placeholder="Full Name"
                            required
                            disabled={loading}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#5182c4] focus:bg-white transition-all disabled:opacity-60"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Work Email
                        </label>
                        <input
                            type="email"
                            name="workEmail"
                            value={formData.workEmail}
                            onChange={handleChange}
                            placeholder="name@motiengineering.com"
                            required
                            disabled={loading}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#5182c4] focus:bg-white transition-all disabled:opacity-60"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Gender
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            <label className={`flex items-center justify-center border rounded-xl py-3 px-2 text-sm font-medium cursor-pointer transition-all ${loading ? "pointer-events-none opacity-60" : ""
                                } ${formData.gender === "male"
                                    ? "border-[#5182c4] bg-[#5182c4]/5 text-[#5182c4]"
                                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                                }`}>
                                <input
                                    type="radio"
                                    name="gender"
                                    value="male"
                                    checked={formData.gender === "male"}
                                    onChange={handleChange}
                                    className="sr-only"
                                    required
                                    disabled={loading}
                                />
                                Male
                            </label>

                            <label className={`flex items-center justify-center border rounded-xl py-3 px-2 text-sm font-medium cursor-pointer transition-all ${loading ? "pointer-events-none opacity-60" : ""
                                } ${formData.gender === "female"
                                    ? "border-[#5182c4] bg-[#5182c4]/5 text-[#5182c4]"
                                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                                }`}>
                                <input
                                    type="radio"
                                    name="gender"
                                    value="female"
                                    checked={formData.gender === "female"}
                                    onChange={handleChange}
                                    className="sr-only"
                                    required
                                    disabled={loading}
                                />
                                Female
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="••••••••"
                            required
                            disabled={loading}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#5182c4] focus:bg-white transition-all disabled:opacity-60"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder="••••••••"
                            required
                            disabled={loading}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#5182c4] focus:bg-white transition-all disabled:opacity-60"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#5182c4] hover:bg-[#436fa8] text-white font-bold text-sm rounded-xl py-3 mt-4 transition-all duration-200 shadow-md shadow-blue-500/10 disabled:bg-slate-400 disabled:cursor-not-allowed"
                    >
                        {loading ? "Creating Account..." : "Create Staff Account"}
                    </button>
                </form>

                <div className="mt-6 text-center text-xs text-slate-400">
                    Already have a staff account?{" "}
                    <a href="#signin" className="text-[#5182c4] hover:underline font-bold">
                        Sign In
                    </a>
                </div>

            </div>
        </div>
    );
}