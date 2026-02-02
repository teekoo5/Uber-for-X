import { MapPin, Users, BarChart3, Smartphone } from "lucide-react";

export const features = [
  {
    title: "Real-Time Fleet Tracking",
    description: "Monitor your entire fleet on a live map with sub-second GPS updates. Know exactly where every vehicle is at all times.",
    icon: <MapPin className="w-6 h-6" />,
    image: "/lovable-uploads/86329743-ee49-4f2e-96f7-50508436273d.png"
  },
  {
    title: "Smart Dispatch System",
    description: "AI-powered matching algorithm that assigns the nearest available driver based on real-time traffic and ETA calculations.",
    icon: <Users className="w-6 h-6" />,
    image: "/lovable-uploads/7335619d-58a9-41ad-a233-f7826f56f3e9.png"
  },
  {
    title: "Analytics Dashboard",
    description: "Comprehensive insights into fleet performance, driver metrics, revenue tracking, and operational efficiency.",
    icon: <BarChart3 className="w-6 h-6" />,
    image: "/lovable-uploads/b6436838-5c1a-419a-9cdc-1f9867df073d.png"
  },
  {
    title: "White-Label Mobile Apps",
    description: "Fully branded iOS and Android apps for both riders and drivers. Your brand, your identity, our technology.",
    icon: <Smartphone className="w-6 h-6" />,
    image: "/lovable-uploads/79f2b901-8a4e-42a5-939f-fae0828e0aef.png"
  }
];