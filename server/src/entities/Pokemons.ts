import { Field, ObjectType } from "type-graphql";
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@ObjectType()
@Entity()
export class Pokemons extends BaseEntity {
    @Field()
    @PrimaryGeneratedColumn()
    id!: number;

    @Field()
    @Column()
    type_1!: string;

    @Field()
    @Column()
    type_2!: string;

    @Field()
    @Column()
    name!: string;

    @Field()
    @Column()
    description!: string;
}
