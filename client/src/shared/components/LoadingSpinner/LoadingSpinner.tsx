import { motion } from "framer-motion";

export const PageLoader = () => {
  return (
    <div className="flex items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="border-border/40 bg-card/80 inline-flex items-center gap-4 rounded-2xl border px-6 py-3.5 shadow-xl backdrop-blur-md"
      >
        <div className="relative flex h-5 w-5 items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: 1.2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
            className="border-primary/20 border-t-primary h-full w-full rounded-full border-2"
          />
        </div>
        <motion.span
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{
            duration: 1,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
          className="text-foreground text-sm font-semibold tracking-tight"
        >
          Loading...
        </motion.span>
      </motion.div>
    </div>
  );
};
