import { ChangeEvent } from 'react';

interface CrawlBatchSizeInputProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export default function CrawlBatchSizeInput({
  value,
  onChange,
  disabled = false
}: CrawlBatchSizeInputProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value);
    if (Number.isNaN(next)) {
      return;
    }
    onChange(next < 1 ? 1 : Math.floor(next));
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700" htmlFor="crawl-batch-size">
        1회 크롤링 건수
      </label>
      <input
        id="crawl-batch-size"
        type="number"
        min={1}
        step={1}
        value={value}
        disabled={disabled}
        onChange={handleChange}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <p className="text-xs text-gray-500">
        최신 공고부터 최대 {value}건까지 수집합니다. 필요에 따라 게시판별로 조정하세요.
      </p>
    </div>
  );
}
