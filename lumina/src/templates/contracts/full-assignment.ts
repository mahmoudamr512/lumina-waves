import { renderContract, type ContractData } from './index'

/**
 * Full economic-rights assignment — renders a complete HTML contract string.
 * The grant type is fixed to FULL_ASSIGNMENT; caller supplies party and scope data.
 */
export function renderFullAssignment(d: ContractData): string {
  return renderContract('FULL_ASSIGNMENT', d)
}
