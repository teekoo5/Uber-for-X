import { Github, Mail } from "lucide-react";
import { Button } from "./ui/button";

const Footer = () => {
  return (
    <footer className="w-full py-12 mt-20">
      <div className="container px-4">
        <div className="glass glass-hover rounded-xl p-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="space-y-2 text-center md:text-left">
              <h3 className="font-medium text-lg">FleetDrive</h3>
              <p className="text-sm text-muted-foreground">
                White-label ride-hailing platform source code.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <a href="#features" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Pricing
              </a>
              <a href="https://github.com/teekoo5/Uber-for-X" target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="icon">
                  <Github className="w-4 h-4" />
                </Button>
              </a>
              <a href="mailto:hello@fleetdrive.io">
                <Button variant="ghost" size="icon">
                  <Mail className="w-4 h-4" />
                </Button>
              </a>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-white/10">
            <p className="text-sm text-muted-foreground text-center">
              © {new Date().getFullYear()} FleetDrive. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;