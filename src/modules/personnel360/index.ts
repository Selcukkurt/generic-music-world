/**
 * Personnel 360 module.
 * Centralized data loading, queries, and mapping.
 */

export { loadPersonnel360 } from "./loader/loadPersonnel360";
export { fetchPersonnel360Raw } from "./queries/personnelQueries";
export { mapRawToPersonnel360Slice } from "./mappers/personnel360Mapper";
export type {
  Personnel360RawData,
  Personnel360RealDataSlice,
} from "./types/personnel360.types";
