import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
class CouponGenerator {

    @PrimaryGeneratedColumn()
    id: number;
    description: string;

    @Column({ type: 'int' })
    // To keep numbers generated unique
    generatorNumber: number;

    @Column({ type: Date })
    lastGeneratedAt: Date;

}
export {CouponGenerator}
