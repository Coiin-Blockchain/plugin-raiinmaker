import { v4 as uuidv4 } from 'uuid';
import { UUID } from '../types';

export function ensureUUID(id: string | undefined): UUID {
    if (!id) {
        return uuidv4() as UUID;
    }
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        return id as UUID;
    }
    return uuidv4() as UUID;
} 