import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

const TITLE_ROTATION_INTERVAL_MS = 2200;
const TITLE_SLIDE_OFFSET_PX = 120;
const SPRING_STIFFNESS = 50;

function AnimatedHero({ onGetStarted, loading }) {
    const [titleNumber, setTitleNumber] = useState(0);
    const titles = useMemo(
        () => ["instant", "secure", "transparent", "effortless", "unstoppable"],
        []
    );

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setTitleNumber(titleNumber === titles.length - 1 ? 0 : titleNumber + 1);
        }, TITLE_ROTATION_INTERVAL_MS);
        return () => clearTimeout(timeoutId);
    }, [titleNumber, titles]);

    return (
        <div className="relative min-h-[85vh] flex items-center justify-center overflow-hidden bg-black grid-bg radial-hero -mx-4 sm:-mx-6 lg:-mx-8 -mt-12 px-4 sm:px-6 lg:px-8">
            {/* Ambient glow */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[128px] pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto py-20">
                {/* Logo */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="mb-8"
                >
                    <div className="glow-amber rounded-full p-1">
                        <img
                            src="/logo.svg"
                            alt="TipStream"
                            width={96}
                            height={96}
                            className="h-24 w-24 object-contain"
                        />
                    </div>
                </motion.div>

                {/* Badge */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                >
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-amber-400 uppercase tracking-widest mb-8">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 pulse-live" />
                        Built on Stacks &middot; Secured by Bitcoin
                    </span>
                </motion.div>

                {/* Heading */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35, duration: 0.6 }}
                    className="mb-6"
                >
                    <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter text-white leading-[1.05]">
                        Send tips that are
                        <span className="relative flex w-full justify-center overflow-hidden h-[1.2em] mt-1">
                            &nbsp;
                            {titles.map((title, index) => (
                                <motion.span
                                    key={index}
                                    className="absolute font-black bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent glow-text"
                                    initial={{ opacity: 0, y: -TITLE_SLIDE_OFFSET_PX }}
                                    transition={{ type: "spring", stiffness: SPRING_STIFFNESS }}
                                    animate={
                                        titleNumber === index
                                            ? { y: 0, opacity: 1 }
                                            : {
                                                y: titleNumber > index ? -TITLE_SLIDE_OFFSET_PX : TITLE_SLIDE_OFFSET_PX,
                                                opacity: 0,
                                            }
                                    }
                                >
                                    {title}
                                </motion.span>
                            ))}
                        </span>
                    </h1>
                </motion.div>

                {/* Subtitle */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="text-base sm:text-lg text-gray-400 max-w-xl leading-relaxed mb-10"
                >
                    The simplest way to send STX micro-tips to creators, builders, and friends on the Stacks blockchain. Low fees. Full transparency. No middlemen.
                </motion.p>

                {/* CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.65, duration: 0.5 }}
                    className="flex flex-col sm:flex-row gap-4"
                >
                    <button
                        onClick={onGetStarted}
                        disabled={loading}
                        className="group relative px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold text-base rounded-xl shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="flex items-center gap-2">
                            {loading ? 'Connecting...' : 'Connect Wallet'}
                            {!loading && (
                                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            )}
                        </span>
                    </button>
                    <a
                        href="https://explorer.hiro.so/txid/SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.tipstream?chain=mainnet"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-8 py-4 bg-white/5 border border-white/10 text-white font-semibold text-base rounded-xl hover:bg-white/10 transition-all text-center"
                    >
                        View Contract
                    </a>
                </motion.div>

                {/* Stats pills */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9, duration: 0.6 }}
                    className="flex flex-wrap justify-center gap-4 mt-16"
                >
                    {[
                        { label: 'Platform Fee', value: '0.5%' },
                        { label: 'Network', value: 'Stacks L2' },
                        { label: 'Settlement', value: 'Bitcoin' },
                    ].map((item) => (
                        <div
                            key={item.label}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/5"
                        >
                            <span className="text-xs text-gray-500 font-medium">{item.label}</span>
                            <span className="text-xs text-white font-bold">{item.value}</span>
                        </div>
                    ))}
                </motion.div>
            </div>
        </div>
    );
}

export { AnimatedHero };
