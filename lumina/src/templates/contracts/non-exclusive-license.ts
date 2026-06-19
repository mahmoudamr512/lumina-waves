import { renderContract, type ContractData } from './index'

/**
 * Non-exclusive license — renders a complete HTML contract string.
 * The grant type is fixed to NON_EXCLUSIVE_LICENSE; caller supplies party and scope data.
 */
export function renderNonExclusiveLicense(d: ContractData): string {
  return renderContract('NON_EXCLUSIVE_LICENSE', d)
}
