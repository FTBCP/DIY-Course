import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

export default function Header() {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/signin');
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-[#F5F1E8] border-b border-[#E0D5C0] px-6 flex items-center justify-between z-50">
      <div className="flex items-center gap-2 text-[#1A1614] font-serif font-medium text-lg">
        <BookOpen size={20} className="text-[#C4553F]" />
        <span>DIY Courses</span>
      </div>
      <button 
        onClick={handleSignOut}
        className="text-sm font-sans font-medium text-[#5C4A3A] hover:text-[#C4553F] transition-colors"
      >
        Sign out
      </button>
    </header>
  );
}
