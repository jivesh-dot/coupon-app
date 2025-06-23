import { UserVoucher } from 'src/voucher/entities/voucher.entity';
import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn, OneToMany } from 'typeorm';

@Entity()
class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  name: string;

}


@Entity()
class Customer {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User)
  @JoinColumn()
  user: User;

  @OneToMany(() => UserVoucher, voucher => voucher.user)
  customerVouchers: UserVoucher[];

  // We can define additional fields for Customer if needed

}

export { User, Customer };