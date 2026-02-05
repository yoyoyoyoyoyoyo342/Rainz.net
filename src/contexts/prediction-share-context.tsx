 import { useState, createContext, useContext, ReactNode } from "react";
 import { PredictionShare } from "@/components/weather/prediction-share";
 
 interface PredictionData {
   high: string;
   low: string;
   condition: string;
   location: string;
 }
 
 interface PredictionShareContextType {
   openShareDialog: (prediction: PredictionData) => void;
 }
 
 const PredictionShareContext = createContext<PredictionShareContextType | null>(null);
 
 export function usePredictionShare() {
   const context = useContext(PredictionShareContext);
   if (!context) {
     throw new Error("usePredictionShare must be used within PredictionShareProvider");
   }
   return context;
 }
 
 interface PredictionShareProviderProps {
   children: ReactNode;
 }
 
 export function PredictionShareProvider({ children }: PredictionShareProviderProps) {
   const [isOpen, setIsOpen] = useState(false);
   const [prediction, setPrediction] = useState<PredictionData | null>(null);
 
   const openShareDialog = (predictionData: PredictionData) => {
     setPrediction(predictionData);
     setIsOpen(true);
   };
 
   const handleClose = () => {
     setIsOpen(false);
     // Delay clearing prediction to allow dialog close animation
     setTimeout(() => setPrediction(null), 300);
   };
 
   return (
     <PredictionShareContext.Provider value={{ openShareDialog }}>
       {children}
       
       {/* Global Prediction Share Dialog - rendered at root level */}
       {prediction && (
         <PredictionShare
           prediction={prediction}
           isOpen={isOpen}
           onClose={handleClose}
         />
       )}
     </PredictionShareContext.Provider>
   );
 }