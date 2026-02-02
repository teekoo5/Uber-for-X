import { motion } from "framer-motion";

const LogoCarousel = () => {
  // Partner/integration logos - using text placeholders for now
  const partners = [
    "Stripe",
    "Google Maps",
    "Twilio",
    "AWS",
    "Firebase",
    "Mapbox",
    "Paytrail",
    "MobilePay",
  ];

  const extendedPartners = [...partners, ...partners, ...partners];

  return (
    <div className="w-full overflow-hidden bg-background/50 backdrop-blur-sm py-12 mt-20">
      <p className="text-center text-sm text-muted-foreground mb-8">Powered by industry-leading technology</p>
      <motion.div 
        className="flex space-x-16"
        initial={{ opacity: 0, x: "0%" }}
        animate={{
          opacity: 1,
          x: "-50%"
        }}
        transition={{
          opacity: { duration: 0.5 },
          x: {
            duration: 20,
            repeat: Infinity,
            ease: "linear",
            delay: 0.5
          }
        }}
        style={{
          width: "fit-content",
          display: "flex",
          gap: "4rem"
        }}
      >
        {extendedPartners.map((partner, index) => (
          <motion.div
            key={`partner-${index}`}
            className="h-8 flex items-center px-4 py-2 rounded-lg bg-white/5 border border-white/10"
            initial={{ opacity: 0.5 }}
            whileHover={{ 
              opacity: 1,
              scale: 1.05,
              transition: { duration: 0.2 }
            }}
          >
            <span className="text-sm font-medium text-white/70 whitespace-nowrap">{partner}</span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default LogoCarousel;