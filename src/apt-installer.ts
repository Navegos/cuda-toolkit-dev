import * as core from '@actions/core'
import {OSType, getOs} from './platform.js'
import {Method} from './method.js'
import {SemVer} from 'semver'
import {exec} from '@actions/exec'
import {execReturnOutput} from './run-command.js'
import {CPUArch, getArch} from './arch.js'

export const firstLinuxArm64Version = new SemVer('11.0.1')

export async function useApt(method: Method): Promise<boolean> {
  return method === 'network' && (await getOs()) === OSType.linux
}

export async function aptSetup(version: SemVer): Promise<void> {
  const osType = await getOs()
  if (osType !== OSType.linux) {
    throw new Error(
      `apt setup can only be run on linux runners! Current os type: ${osType}`
    )
  }
  core.debug(`Setup packages for CUDA ${version}`)
  const ubuntuVersion: string = await execReturnOutput('lsb_release', ['-sr'])
  const ubuntuVersionNoDot = ubuntuVersion.replace('.', '')

  // Dynamically determine architecture
  let cpuArch = CPUArch.x86_64
  try {
    cpuArch = await getArch()
  } catch (error) {
    core.debug(`Error detecting architecture: ${error}`)
    core.warning(`Could not detect architecture, using default ${CPUArch.x86_64}`)
  }

  if (cpuArch === CPUArch.arm64) {
    if (version.compare(firstLinuxArm64Version) < 0) {
      throw new Error(
        `CUDA ${version} does not support Linux ARM64 (sbsa). Minimum supported version is ${firstLinuxArm64Version}.`
      )
    }
  }

  const arch = cpuArch === CPUArch.arm64 ? 'sbsa' : 'x86_64'
  core.debug(`Detected architecture: ${cpuArch}, using arch string: ${arch}`)

  const pinFilename = `cuda-ubuntu${ubuntuVersionNoDot}.pin`
  const pinUrl = `https://developer.download.nvidia.com/compute/cuda/repos/ubuntu${ubuntuVersionNoDot}/${arch}/${pinFilename}`
  const repoUrl = `https://developer.download.nvidia.com/compute/cuda/repos/ubuntu${ubuntuVersionNoDot}/${arch}/`
  const keyRingVersion = `1.1-1`
  const keyRingUrl = `https://developer.download.nvidia.com/compute/cuda/repos/ubuntu${ubuntuVersionNoDot}/${arch}/cuda-keyring_${keyRingVersion}_all.deb`
  const keyRingFilename = `cuda_keyring.deb`

  core.debug(`Pin filename: ${pinFilename}`)
  core.debug(`Pin url: ${pinUrl}`)
  core.debug(`Keyring url: ${keyRingUrl}`)

  core.debug(`Downloading keyring`)
  await exec(`wget ${keyRingUrl} -O ${keyRingFilename}`)
  await exec(`sudo dpkg -i ${keyRingFilename}`)
  await exec(`rm -f ${keyRingFilename}`)

  core.debug('Adding CUDA Repository')
  await exec(`wget ${pinUrl}`)
  await exec(
    `sudo mv ${pinFilename} /etc/apt/preferences.d/cuda-repository-pin-600`
  )
  await exec(`sudo add-apt-repository "deb ${repoUrl} /"`)
  await exec(`sudo apt-get update`)
}

export async function aptInstall(
  version: SemVer,
  subPackages: string[],
  nonCudaSubPackages: string[]
): Promise<number> {
  const osType = await getOs()
  if (osType !== OSType.linux) {
    throw new Error(
      `apt install can only be run on linux runners! Current os type: ${osType}`
    )
  }

  try {
    const cpuArch = await getArch()
    if (cpuArch === CPUArch.arm64 && version.compare(firstLinuxArm64Version) < 0) {
      throw new Error(
        `CUDA ${version} does not support Linux ARM64 (sbsa). Minimum supported version is ${firstLinuxArm64Version}.`
      )
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('does not support Linux ARM64')
    ) {
      throw error
    }
  }

  const execOptions = {
    env: {
      ...process.env,
      DEBIAN_FRONTEND: 'noninteractive'
    }
  }

  if (subPackages.length === 0) {
    // Install everything
    const packageName = `cuda-${version.major}-${version.minor}`
    core.debug(`Install package: ${packageName}`)
    return await exec(`sudo apt-get -y install`, [packageName], execOptions)
  } else {
    // Only install specified packages
    const prefixedSubPackages = subPackages.map(
      subPackage => `cuda-${subPackage}`
    )
    const versionedSubPackages = prefixedSubPackages
      .concat(nonCudaSubPackages)
      .map(
        nonCudaSubPackage =>
          `${nonCudaSubPackage}-${version.major}-${version.minor}`
      )
    core.debug(`Only install subpackages: ${versionedSubPackages}`)
    return await exec(`sudo apt-get -y install`, versionedSubPackages, execOptions)
  }
}
