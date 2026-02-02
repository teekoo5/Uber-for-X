import { MapPin, Users, BarChart3, Smartphone, Car } from "lucide-react";

export const features = [
  {
    title: "Dispatch Dashboard",
    description: "Monitor your entire fleet on a live map with sub-second GPS updates. Know exactly where every vehicle is at all times.",
    icon: <MapPin className="w-6 h-6" />,
    image: "/lovable-uploads/86329743-ee49-4f2e-96f7-50508436273d.png"
  },
  {
    title: "Rider App",
    description: "Beautiful mobile app for passengers to book rides, track drivers in real-time, and pay seamlessly. Available on iOS and Android.",
    icon: <Smartphone className="w-6 h-6" />,
    image: "/lovable-uploads/7335619d-58a9-41ad-a233-f7826f56f3e9.png"
  },
  {
    title: "Driver App",
    description: "Intuitive driver app with turn-by-turn navigation, earnings tracking, and ride management. Everything drivers need in one place.",
    icon: <Car className="w-6 h-6" />,
    image: "/lovable-uploads/79f2b901-8a4e-42a5-939f-fae0828e0aef.png"
  },
  {
    title: "Analytics & Reports",
    description: "Comprehensive insights into fleet performance, driver metrics, revenue tracking, and operational efficiency.",
    icon: <BarChart3 className="w-6 h-6" />,
    image: "/lovable-uploads/b6436838-5c1a-419a-9cdc-1f9867df073d.png"
  }
];