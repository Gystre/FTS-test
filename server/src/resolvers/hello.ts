import { Query, Resolver } from "type-graphql";

@Resolver()
export class HelloResolver {
    @Query(() => String) //return type
    hello() {
        return "hello world";
    }
}
