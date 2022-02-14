import { Arg, Query, Resolver } from "type-graphql";
import { getConnection } from "typeorm";
import { Pokemons } from "../entities/Pokemons";

@Resolver()
export class PokemonsResolver {
    @Query(() => [Pokemons])
    async search(
        @Arg("search", () => String) search: string
    ): Promise<Pokemons[]> {
        return getConnection()
            .createQueryBuilder(Pokemons, "p")
            .select()
            .where("document_with_weights @@ plainto_tsquery(:query)", {
                query: search,
            })
            .orderBy(
                "ts_rank(document_with_weights, plainto_tsquery(:query))",
                "DESC"
            )
            .getMany();
    }
}
