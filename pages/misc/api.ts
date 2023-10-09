export type RepoDetailResponse = {
  id: number;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
};
export const fetchFloppyDiskRepo = async (): Promise<RepoDetailResponse> => {
  const res = await fetch('https://api.github.com/repos/afiiif/floppy-disk');
  if (res.ok) return res.json();
  throw res;
};

export type BundlephobiaApiResponse = {
  name: string;
  size: number;
  gzip: number;
  dependencySizes: { name: string; approximateSize: number }[];
};
export const fetchBundlephobia = async (packageName: string): Promise<BundlephobiaApiResponse> => {
  const res = await fetch(`https://bundlephobia.com/api/size?package=${packageName}`);
  if (res.ok) return res.json();
  throw res;
};
