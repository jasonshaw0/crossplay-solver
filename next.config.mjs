const repository = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? '';
const isProjectPages = process.env.GITHUB_ACTIONS === 'true' && !repository.endsWith('.github.io');
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? (isProjectPages ? `/${repository}` : '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
