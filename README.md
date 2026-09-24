# cuda-toolkit-dev

This action installs the
[NVIDIA® CUDA® Toolkit](https://developer.nvidia.com/cuda-toolkit) on the
system. It adds the CUDA install location as `CUDA_PATH` to `GITHUB_ENV` so you
can access the CUDA install location in subsequent steps. `CUDA_PATH/bin` is
added to `GITHUB_PATH` so you can use commands such as `nvcc` directly in
subsequent steps.

## Supported Platforms and Architectures

| OS                       | Runner Image                                               | Architecture     | Supported CUDA Versions |
| :----------------------- | :--------------------------------------------------------- | :--------------- | :---------------------- |
| **Ubuntu Linux**         | `ubuntu-26.04`, `ubuntu-24.04`, `ubuntu-22.04`             | `x86_64` (`x64`) | `8.0.61` – `13.4.2`     |
| **Ubuntu Linux (ARM64)** | `ubuntu-26.04-arm`, `ubuntu-24.04-arm`, `ubuntu-22.04-arm` | `arm64` (`sbsa`) | `>= 11.0.1` – `13.4.2`  |
| **Windows**              | `windows-2025-vs2026`, `windows-2025`, `windows-2022`      | `x86_64` (`x64`) | `8.0.61` – `13.4.2`     |
| **Windows (ARM64)**      | `windows-11-arm`, `windows-11-vs2026-arm`                  | `arm64`          | `>= 13.4.1` – `13.4.2`  |

> **Note on ARM64:**
>
> - Linux ARM64 requires CUDA version `>= 11.0.1` (older versions do not have `linux_sbsa` builds).
> - Windows ARM64 requires CUDA version `>= 13.4.1` (older versions do not have `windows_arm64` builds).

## Inputs

### `cuda`

**Optional** The CUDA version to install. View `src/links/windows-links.ts` and
`src/links/linux-links.ts` for available versions.

Default: `'13.4.2'`.

### `method`

**Optional** Installation method, can be either `'local'` or `'network'`.

- `'local'` downloads the entire installer with all packages and runs that (you
  can still only install certain packages with `sub-packages` on Windows).
- `'network'` downloads a smaller executable which only downloads necessary
  packages which you can define in `sub-packages`. On Linux, this uses APT.

Default: `'local'`.

### `sub-packages`

**NOTE: On Linux this only works with the 'network' method
[view details](#method)**

**Optional** If set, only the specified CUDA subpackages will be installed. Must
be in the form of a JSON array. For example, if you only want to install nvcc
and visual studio integration:
`'["nvcc", "visual_studio_integration"]'` (double quotes required).

Default: `'[]'`.

### `non-cuda-sub-packages`

**NOTE: This only works on Linux with the 'network' method
[view details](#method)**

**Optional** If set, only the specified CUDA subpackages will be installed
without prepending the "cuda-" prefix. Must be in the form of a JSON array. For
example, if you only want to install libcublas and libcufft:
`'["libcublas", "libcufft"]'` (double quotes required).

Default: `'[]'`.

### `linux-local-args`

**Optional** (For Linux and 'local' method only) override arguments for the
Linux `.run` installer. For example if you don't want samples use
`'["--toolkit"]'` (double quotes required). See the
[Nvidia Docs](https://docs.nvidia.com/cuda/cuda-installation-guide-linux/index.html#runfile-advanced)
for available options. Note that the `--silent` option is already always added
by the action itself.

Default: `'["--toolkit", "--samples"]'`.

### `use-github-cache`

**Optional** Whether to use GitHub Actions cache to cache downloaded installers
on GitHub servers.

Default: `'true'`.

### `use-local-cache`

**Optional** Whether to use local cache to cache downloaded installers on the
local runner disk.

Default: `'true'`.

### `log-file-suffix`

**Required with matrix builds**

Add suffix to the log file name which gets uploaded as an artifact. This **has**
to be set when running a matrix build to avoid log artifact collisions.

Default: `'log.txt'`.

## Outputs

### `cuda`

The CUDA version installed (same as `cuda` from input).

### `CUDA_PATH`

The path where CUDA is installed (same as `CUDA_PATH` in `GITHUB_ENV`).

## Example Usage

### Basic Single-Job Step

```yaml
steps:
  - uses: actions/checkout@v7

  - uses: Navegos/cuda-toolkit-dev@v0.2.40
    id: cuda-toolkit-dev
    with:
      cuda: '13.4.2'
      method: 'local'

  - run: echo "Installed cuda version is: ${{ steps.cuda-toolkit-dev.outputs.cuda }}"
  - run: echo "Cuda install location: ${{ steps.cuda-toolkit-dev.outputs.CUDA_PATH }}"
  - run: nvcc -V
```

### Full Multi-OS and Multi-Architecture Matrix (`CI.yml`)

```yaml
name: CI

on:
  push:
    branches: [master]
  pull_request:

jobs:
  build:
    strategy:
      fail-fast: false
      matrix:
        include:
          # Linux x64
          - os: ubuntu-24.04
            method: network
            cuda: '13.4.2'
          # Linux ARM64 (CUDA >= 11.0.1)
          - os: ubuntu-24.04-arm
            method: network
            cuda: '13.4.2'
          # Windows x64
          - os: windows-2025
            method: local
            cuda: '13.4.2'
          # Windows ARM64 (CUDA >= 13.4.1)
          - os: windows-11-arm
            method: local
            cuda: '13.4.2'
    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v7

      - name: Install CUDA Toolkit
        id: cuda-toolkit-dev
        uses: Navegos/cuda-toolkit-dev@v0.2.40
        with:
          cuda: ${{ matrix.cuda }}
          method: ${{ matrix.method }}
          log-file-suffix: '${{ matrix.os }}-${{ matrix.method }}'
          use-github-cache: 'true'

      - name: Verify NVCC
        run: nvcc -V

      - name: Verify CUDA Path
        run: echo "CUDA_PATH=${{ steps.cuda-toolkit-dev.outputs.CUDA_PATH }}"
```
