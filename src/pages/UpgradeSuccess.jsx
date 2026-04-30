import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';

export default function UpgradeSuccess() {
  return (
    <div className="min-h-screen bg-[#F5F1E8] flex flex-col items-center justify-center px-6 text-center">
      <div className="w-14 h-14 bg-[#C4553F] rounded-full flex items-center justify-center mb-6">
        <Check size={28} color="white" strokeWidth={2.5} />
      </div>
      <h1 className="font-serif text-[36px] font-medium text-[#1A1614] mb-3 leading-tight">
        You're all set.
      </h1>
      <p className="text-[16px] text-[#5C4A3A] font-sans max-w-[380px] mb-2 leading-relaxed">
        Your subscription is active. You can now create up to 10 courses per month.
      </p>
      <p className="text-[13px] text-[#8B6F4E] font-sans mb-10">
        $9.99/month · cancel anytime
      </p>
      <Link
        to="/"
        className="bg-[#1A1614] text-[#F5F1E8] px-8 py-3.5 rounded font-sans text-[15px] font-semibold hover:bg-[#C4553F] transition-colors"
      >
        Start building your next course →
      </Link>
    </div>
  );
}
