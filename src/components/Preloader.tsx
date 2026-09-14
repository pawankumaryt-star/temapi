import { motion } from "framer-motion";
import { Mail } from "lucide-react";
export default function Preloader(){
 return <motion.div initial={{opacity:1}} exit={{opacity:0}} transition={{duration:.35}} className="loader-overlay">
   <div className="loader-orb"><div className="loader-cube"><Mail size={30}/></div><i/><i/><i/></div>
   <div className="text-center mt-7"><div className="text-2xl font-bold font-display">PN <span className="text-gradient-primary">TEMP MAIL</span></div><p className="text-[11px] uppercase tracking-[.28em] text-muted-foreground mt-2">Securing your inbox</p></div>
   <div className="loader-dots"><b/><b/><b/></div>
 </motion.div>
}
