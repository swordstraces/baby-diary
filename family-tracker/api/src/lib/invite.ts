import { customAlphabet } from 'nanoid'

const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
export const generateInviteCode = customAlphabet(alphabet, 6)
