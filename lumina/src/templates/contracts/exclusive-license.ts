import { renderContract, type ContractData } from './index'

/**
 * Exclusive license — renders a complete HTML contract string.
 * The grant type is fixed to EXCLUSIVE_LICENSE; caller supplies party and scope data.
 */
export function renderExclusiveLicense(d: ContractData): string {
  return renderContract('EXCLUSIVE_LICENSE', d)
}
