import { renderContract, type ContractData } from './index'

/**
 * Management-only contract — renders a complete HTML contract string.
 * The grant type is fixed to MANAGEMENT; caller supplies party and scope data.
 */
export function renderManagement(d: ContractData): string {
  return renderContract('MANAGEMENT', d)
}
