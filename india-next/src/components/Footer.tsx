import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-white py-16 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Contact Section */}
        <div className="text-center mb-12">
          <h3 className="text-lg tracking-[0.3em] mb-4">CONTACT</h3>
          <p className="text-gray-600 text-xs mb-8 tracking-wider">YOUR DREAM JOURNEY AWAITS</p>
          <p className="text-gray-600 text-sm">
            Indiaesque | hello@indiaesque.com<br />
            New Delhi, India
          </p>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12 text-center">
          <div>
            <h4 className="text-xs tracking-wider mb-4 font-medium">DESTINATIONS</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/delhi" className="hover:text-black transition-colors">Delhi</Link></li>
              <li><Link href="/jaipur" className="hover:text-black transition-colors">Jaipur</Link></li>
              <li><Link href="/mumbai" className="hover:text-black transition-colors">Mumbai</Link></li>
              <li><Link href="/goa" className="hover:text-black transition-colors">Goa</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs tracking-wider mb-4 font-medium">COLLECTIONS</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="#" className="hover:text-black transition-colors">Luxury</Link></li>
              <li><Link href="#" className="hover:text-black transition-colors">Adventure</Link></li>
              <li><Link href="#" className="hover:text-black transition-colors">Cultural</Link></li>
              <li><Link href="#" className="hover:text-black transition-colors">Wellness</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs tracking-wider mb-4 font-medium">COMPANY</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/about" className="hover:text-black transition-colors">About Us</Link></li>
              <li><Link href="#" className="hover:text-black transition-colors">Journals</Link></li>
              <li><Link href="/contact" className="hover:text-black transition-colors">Contact</Link></li>
              <li><Link href="#" className="hover:text-black transition-colors">Careers</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs tracking-wider mb-4 font-medium">LEGAL</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="#" className="hover:text-black transition-colors">Privacy</Link></li>
              <li><Link href="#" className="hover:text-black transition-colors">Terms</Link></li>
              <li><Link href="#" className="hover:text-black transition-colors">Cookies</Link></li>
            </ul>
          </div>
        </div>

        {/* Social Media */}
        <div className="flex justify-center gap-8 mb-12">
          <a href="#" className="text-black hover:text-gray-600 transition-colors">
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
            </svg>
          </a>
          <a href="#" className="text-black hover:text-gray-600 transition-colors">
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
            </svg>
          </a>
          <a href="#" className="text-black hover:text-gray-600 transition-colors">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
            </svg>
          </a>
        </div>

        {/* Copyright */}
        <div className="text-center text-xs text-gray-500">
          <p className="mb-2">&copy; Indiaesque {new Date().getFullYear()}</p>
          <p className="tracking-wider">DESIGNED & BUILT IN INDIA</p>
        </div>
      </div>
    </footer>
  );
}
