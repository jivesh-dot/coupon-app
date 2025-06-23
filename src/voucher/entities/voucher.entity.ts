import { User } from 'src/user/entities/user.entity';
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';


@Entity()
class SpecialOffer{
    @PrimaryGeneratedColumn()
    id: number;
    
    @Column()
    description: string;
    
    @Column('decimal')
    discountAmount: number;
    
    @Column({ type: 'date', default: () => "CURRENT_DATE + INTERVAL '60 days'"})
    expirationDate: Date;
}

@Entity()
class UserVoucher{
    @PrimaryGeneratedColumn()
    id: number;
    
    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => SpecialOffer, { onDelete: 'NO ACTION' })
    @JoinColumn({ name: 'special_offer_id' })
    specialOffer: SpecialOffer;
    
    @Column()
    voucherCode: string;

    @Column({ type: 'date', nullable: true, default: null  })
    redeemedAt: Date;
    
    @Column({ default: false })
    isRedeemed: boolean;
}

export {SpecialOffer, UserVoucher}
