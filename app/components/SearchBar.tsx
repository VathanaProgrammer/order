import Icon from "@/components/Icon";
import { ICONS } from "@/constants/icons";
import { useLanguage } from "@/context/LanguageContext";

type SearchBarProps = {
  onSearch: (query: string) => void;
};

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const { language, t } = useLanguage();
  return (
    <div className="relative w-full mt-4 rounded-[5px] bg-gray-500 h-[35px] flex items-center">
      <div className="absolute left-3">
        <Icon icon={ICONS.SEARCH} width={15} height={15} className="text-gray-200" />
      </div>
      <input
        type="search"
        placeholder={t.search}
        onChange={(e) => onSearch(e.target.value)}
        className="w-full h-full pl-10 pr-3 bg-gray-500 text-white rounded-[5px] focus:outline-none"
      />
    </div>
  );
};


export default SearchBar;
