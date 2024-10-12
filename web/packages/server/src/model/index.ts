export interface Model<E, NE> {
  findByID(id: number): Promise<E | undefined>
  findByKeyword(keyword: string): Promise<E[]>
  insert(data: NE): Promise<E>
  update(id: number, data: NE): Promise<E>
  delete(id: number): void
}
