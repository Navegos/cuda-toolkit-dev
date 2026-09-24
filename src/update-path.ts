import * as core from '@actions/core'
import * as path from 'node:path'
import {OSType, getOs} from './platform.js'
import {SemVer} from 'semver'

export async function updatePath(version: SemVer): Promise<string> {
  const osType = await getOs()
  let cudaPath: string
  switch (osType) {
    case OSType.linux:
      cudaPath = `/usr/local/cuda-${version.major}.${version.minor}`
      break
    case OSType.windows:
      cudaPath = String.raw`C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v${version.major}.${version.minor}`
      break
    default:
      throw new Error('Unsupported operating system detected for CUDA setup')
  }
  core.debug(`Cuda path: ${cudaPath}`)
  // Export $CUDA_PATH
  core.exportVariable('CUDA_PATH', cudaPath)
  core.debug(`Cuda path vx_y: ${cudaPath}`)
  // Export $CUDA_PATH_VX_Y
  core.exportVariable(`CUDA_PATH_V${version.major}_${version.minor}`, cudaPath)
  core.exportVariable(
    'CUDA_PATH_VX_Y',
    `CUDA_PATH_V${version.major}_${version.minor}`
  )
  // Add $CUDA_PATH/bin to $PATH
  const binPath = path.join(cudaPath, 'bin')
  core.debug(`Adding binaries folder to PATH: ${binPath}`)
  core.addPath(binPath)

  // Update LD_LIBRARY_PATH on linux, see: https://docs.nvidia.com/cuda/cuda-installation-guide-linux/index.html#environment-setup
  if (osType === OSType.linux) {
    const libPath = process.env.LD_LIBRARY_PATH ?? ''

    // Get CUDA lib path
    const cudaLibPath = path.join(cudaPath, 'lib64')

    // Add path reference array checks to protect against duplicate definitions
    if (!libPath.split(':').includes(cudaLibPath)) {
      core.debug(
        `Appending tracking context to LD_LIBRARY_PATH: ${cudaLibPath}`
      )
      core.exportVariable(
        'LD_LIBRARY_PATH',
        libPath ? `${cudaLibPath}${path.delimiter}${libPath}` : cudaLibPath
      )
    }
  }

  return cudaPath
}
