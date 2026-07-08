import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Axios } from "../../../utils/axios";

type VerifyStatus = "loading" | "success" | "error" | "invalid";

export default function VerifyEmailSuccess() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<VerifyStatus>("loading");
    const [message, setMessage] = useState("Verifying your email address...");

    useEffect(() => {
        const token = searchParams.get("token");
        const type = searchParams.get("type");

        if (!token || token.length !== 64 || (type !== "customer" && type !== "staff")) {
            setStatus("invalid");
            setMessage(
                "The verification link is invalid or missing required information. Please use the link from your email or request a new verification email.",
            );
            return;
        }

        const endpoint = type === "staff" ? "/staff/verify-email" : "/customers/verify-email";

        const verifyToken = async () => {
            try {
                const response = await Axios.post(endpoint, { token });
                setStatus("success");
                setMessage(response.data?.message || "Email verified successfully. You can now sign in.");
            } catch (error: any) {
                const serverMessage =
                    error?.response?.data?.error ||
                    error?.message ||
                    "Verification failed. The link may have expired or is invalid.";
                setStatus("error");
                setMessage(serverMessage);
            }
        };

        verifyToken();
    }, [searchParams]);

    const handleProceed = () => {
        navigate("/login");
    };

    const statusStyles: Record<VerifyStatus, string> = {
        loading: "bg-slate-50 text-slate-700 border-slate-200",
        success: "bg-emerald-50 text-emerald-500 border-emerald-100",
        error: "bg-rose-50 text-rose-500 border-rose-100",
        invalid: "bg-amber-50 text-amber-700 border-amber-100",
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-8 font-sans selection:bg-[#5182c4] selection:text-white">
            <div className="w-full max-w-md bg-white border rounded-2xl p-8 shadow-xl text-center" style={{ borderColor: "var(--tw-border-opacity, 1)" }}>
                <div className="mb-6 flex flex-col items-center">
                    <img
                        src="/path-to-your/moti-logo.png"
                        alt="Moti Engineering Logo"
                        className="h-16 w-auto mb-2 object-contain"
                        onError={(e) => {
                            e.currentTarget.style.display = "none";
                        }}
                    />
                    <h1 className="text-xl font-bold tracking-widest text-[#5182c4] uppercase">Moti Engineering</h1>
                    <p className="text-xs font-bold tracking-wider uppercase mt-0.5 text-slate-400">Email Verification</p>
                </div>

                <div className={`my-6 inline-flex items-center justify-center w-16 h-16 rounded-full border ${statusStyles[status]}`}>
                    {status === "loading" ? (
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#5182c4]/20 border-t-[#5182c4]"></div>
                    ) : status === "success" ? (
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            className="w-8 h-8"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                    ) : (
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            className="w-8 h-8"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    )}
                </div>

                <h2 className="text-xl font-bold text-slate-800 mb-2">
                    {status === "success" ? "Email Verified Successfully!" : "Email Verification"}
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed max-w-sm mx-auto mb-8">{message}</p>

                <button
                    type="button"
                    onClick={handleProceed}
                    className="inline-block w-full bg-[#5182c4] hover:bg-[#436fa8] text-white font-bold text-sm rounded-xl py-3 transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-[#5182c4]/30"
                >
                    Proceed to Sign In
                </button>

                <div className="mt-6 text-xs text-slate-400">
                    Need help? <a href="#support" className="text-[#5182c4] hover:underline font-semibold transition-colors">Contact Support</a>
                </div>
            </div>
        </div>
    );
}
