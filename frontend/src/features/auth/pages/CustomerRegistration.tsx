import React, { useState, useEffect } from "react";
import { Axios } from "../../../utils/axios";
import { Link } from "react-router-dom";

type GenderType = "male" | "female" | "";

interface Organization {
    id: string;
    name: string;
}

interface CustomerSignupFormData {
    fullName: string;
    email: string;
    phoneNumber: string;
    gender: GenderType;
    position: string;
    organization: string;
    password: React.InputHTMLAttributes<HTMLInputElement>["value"] & string;
    confirmPassword: string;
}

export default function CustomerSignup() {
    const [formData, setFormData] = useState<CustomerSignupFormData>({
        fullName: "",
        email: "",
        phoneNumber: "",
        gender: "",
        position: "",
        organization: "",
        password: "",
        confirmPassword: ""
    });

    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [fetchingOrgs, setFetchingOrgs] = useState<boolean>(true);


    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [registeredEmail, setRegisteredEmail] = useState<string>("");
    const [error, setError] = useState<string | null>(null);


    const [isResending, setIsResending] = useState<boolean>(false);
    const [resendStatus, setResendStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

    useEffect(() => {
        const fetchOrganizations = async () => {
            try {
                setFetchingOrgs(true);
                const response = await Axios.get("/organizations");
                const data = Array.isArray(response.data) ? response.data : response.data.organizations || [];
                setOrganizations(data);
            } catch (err: any) {
                console.error("Failed to load organizations — full error object:", err);
                if (err?.code === "ERR_NETWORK") {
                    setError("Network error — backend may be down or CORS misconfigured.");
                } else if (err?.response?.status === 401) {
                    setError("401 Unauthorized — GET /organizations needs to be a public endpoint.");
                } else {
                    setError("Could not load organization lists. Please refresh the page.");
                }
            } finally {
                setFetchingOrgs(false);
            }
        };

        fetchOrganizations();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        if (!formData.gender) {
            setError("Please select your gender.");
            setIsSubmitting(false);
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match.");
            setIsSubmitting(false);
            return;
        }

        try {
            const payload = {
                fullName: formData.fullName,
                email: formData.email,
                phoneNumber: formData.phoneNumber,
                position: formData.position,
                organizationId: formData.organization,
                gender: formData.gender.toUpperCase(),
                password: formData.password,
            };

            await Axios.post("/customers/register", payload);

            setRegisteredEmail(formData.email);
            setSuccess(true);
        } catch (err: any) {
            if (err.response?.data?.message) {
                setError(err.response.data.message);
            } else if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Could not complete registration due to mail delivery failure.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResendLink = async () => {
        setIsResending(true);
        setResendStatus(null);

        try {
            await Axios.post("/customers/resend-verification", { email: registeredEmail });
            setResendStatus({
                type: "success",
                message: "A fresh verification link has been sent to your inbox."
            });
        } catch (err: any) {
            const errMsg = err.response?.data?.message || "Failed to resend link. Please try again later.";
            setResendStatus({
                type: "error",
                message: errMsg
            });
        } finally {
            setIsResending(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 font-sans selection:bg-[#5182c4] selection:text-white">
                <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-xl text-center">

                    <div className="mb-4 flex flex-col items-center">
                        <h1 className="text-sm font-bold tracking-widest text-[#5182c4] uppercase">
                            Moti Engineering
                        </h1>
                    </div>

                    <div className="h-16 w-16 bg-blue-50 text-[#5182c4] rounded-full flex items-center justify-center mx-auto mb-5 text-2xl">
                        ✉
                    </div>

                    <h2 className="text-xl font-bold text-slate-800 mb-2">
                        Verify Your Email
                    </h2>
                    <p className="text-sm text-slate-500 leading-relaxed mb-6">
                        We've sent a secure verification link to <span className="font-semibold text-slate-700">{registeredEmail}</span>.
                        Please click the link inside that email to activate your account.
                    </p>

                    {resendStatus && (
                        <div className={`mb-6 p-3 rounded-xl border text-xs font-medium ${resendStatus.type === "success"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : "bg-red-50 border-red-200 text-red-600"
                            }`}>
                            {resendStatus.message}
                        </div>
                    )}

                    <div className="space-y-6">
                        <button
                            type="button"
                            disabled={isResending}
                            onClick={handleResendLink}
                            className="w-full bg-[#5182c4] hover:bg-[#436fa8] text-white font-bold text-sm rounded-xl py-3 transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-[#5182c4]/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isResending ? "Resending verification link..." : "Resend verification link"}
                        </button>

                        {/* <div className="pt-4 border-t border-slate-100 text-xs">
                            <a href="#signin" className="text-slate-400 hover:text-slate-600 font-medium transition-colors">
                                Back to Sign In
                            </a>
                        </div> */}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-8 font-sans selection:bg-[#5182c4] selection:text-white">
            <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-8 shadow-xl">

                <div className="mb-6 text-center flex flex-col items-center">
                    <img
                        src="\New Picture.png"
                        alt="Moti Engineering Logo"
                        className="h-28 w-auto mb-2 object-contain"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                    {/* <h1 className="text-xl font-bold tracking-widest text-[#5182c4] uppercase">
                        Moti Engineering
                    </h1> */}
                    <p className="text-xs font-bold tracking-wider text-slate-400 uppercase mt-0.5">
                        Create Customer Account
                    </p>
                </div>

                {error && (
                    <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium animate-pulse">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-slate-50/50 border border-slate-100 p-5 rounded-xl space-y-4">
                        <h2 className="text-xs font-extrabold text-[#5182c4] tracking-wider uppercase border-b border-slate-200/60 pb-2 mb-2">
                            Account Profile Information
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Full Name</label>
                                <input
                                    type="text"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    placeholder="e.g., Full Name"
                                    required
                                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#5182c4] focus:ring-4 focus:ring-[#5182c4]/10 transition-all duration-200 shadow-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Email Address</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="yourname@example.com"
                                    required
                                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#5182c4] focus:ring-4 focus:ring-[#5182c4]/10 transition-all duration-200 shadow-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Phone Number</label>
                                <input
                                    type="tel"
                                    name="phoneNumber"
                                    value={formData.phoneNumber}
                                    onChange={handleChange}
                                    placeholder="e.g., +251 9______"
                                    required
                                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#5182c4] focus:ring-4 focus:ring-[#5182c4]/10 transition-all duration-200 shadow-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Position / Job Title</label>
                                <input
                                    type="text"
                                    name="position"
                                    value={formData.position}
                                    onChange={handleChange}
                                    placeholder="e.g, Manager"
                                    required
                                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#5182c4] focus:ring-4 focus:ring-[#5182c4]/10 transition-all duration-200 shadow-sm"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Organization / Company</label>
                                <div className="relative">
                                    <select
                                        name="organization"
                                        value={formData.organization}
                                        onChange={handleChange}
                                        required
                                        disabled={fetchingOrgs}
                                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#5182c4] focus:ring-4 focus:ring-[#5182c4]/10 transition-all duration-200 appearance-none shadow-sm cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed"
                                    >
                                        <option value="" disabled>
                                            {fetchingOrgs ? "Loading data options..." : "Select organization"}
                                        </option>
                                        {organizations.map((org) => (
                                            <option key={org.id} value={org.id}>
                                                {org.name}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Gender</label>
                                <div className="grid grid-cols-2 gap-5">
                                    <label className={`flex items-center justify-center border rounded-xl py-2.5 px-2 text-sm font-semibold cursor-pointer transition-all ${formData.gender === "male" ? "border-[#5182c4] bg-[#5182c4]/10 text-[#5182c4] ring-2 ring-[#5182c4]/20" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-400"}`}>
                                        <input type="radio" name="gender" value="male" checked={formData.gender === "male"} onChange={handleChange} className="sr-only" required />
                                        Male
                                    </label>
                                    <label className={`flex items-center justify-center border rounded-xl py-2.5 px-2 text-sm font-semibold cursor-pointer transition-all ${formData.gender === "female" ? "border-[#5182c4] bg-[#5182c4]/10 text-[#5182c4] ring-2 ring-[#5182c4]/20" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-400"}`}>
                                        <input type="radio" name="gender" value="female" checked={formData.gender === "female"} onChange={handleChange} className="sr-only" required />
                                        Female
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50/50 border border-slate-100 p-5 rounded-xl space-y-4">
                        <h2 className="text-xs font-extrabold text-[#5182c4] tracking-wider uppercase border-b border-slate-200/60 pb-2 mb-2">
                            Security Credentials
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Password</label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    required
                                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#5182c4] focus:ring-4 focus:ring-[#5182c4]/10 transition-all duration-200 shadow-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Confirm Password</label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    required
                                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#5182c4] focus:ring-4 focus:ring-[#5182c4]/10 transition-all duration-200 shadow-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-[#5182c4] hover:bg-[#436fa8] text-white font-bold text-sm rounded-xl py-3 mt-2 transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-[#5182c4]/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? "Creating Account..." : "Create Customer Account"}
                    </button>
                </form>

                <div className="mt-4 text-center text-xs text-slate-400">
                    Already have an account?{" "}
                    <Link to="/login" className="text-[#5182c4] hover:underline font-bold">
                        Sign In
                    </Link>
                </div>

            </div>
        </div>
    );
}